<?php

namespace App\Service;

use App\Entity\AvailableSpace;
use App\Entity\Reservation;
use App\Repository\AvailableSpaceRepository;
use App\Repository\ReservationRepository;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;

class ReservationService
{
    public function __construct(
        private EntityManagerInterface $entityManager,
        private AvailableSpaceRepository $spaceRepository,
        private ReservationRepository $reservationRepository,
        private RealtimeSyncService $syncService,
        private WhatsAppService $whatsAppService,
        private LoggerInterface $logger
    ) {}

    /**
     * Crear una nueva reserva con control de concurrencia
     */
    public function createReservation(array $reservationData): array
    {
        $this->entityManager->beginTransaction();

        try {
            // Validar datos de entrada
            $this->validateReservationData($reservationData);

            // Verificar disponibilidad con bloqueo
            $date = new \DateTime($reservationData['date']);
            $space = $this->getAvailableSpaceWithLock($date);

            if (!$space || !$space->hasAvailableSpaces()) {
                throw new \Exception('No hay espacios disponibles para esta fecha');
            }

            // Verificar duplicados
            if ($this->hasDuplicateReservation($reservationData['phone'], $date)) {
                throw new \Exception('Ya existe una reserva activa para este teléfono en esta fecha');
            }

            // Crear la reserva
            $reservation = $this->buildReservation($reservationData, $space);
            
            // Decrementar espacios de forma atómica
            if (!$this->spaceRepository->decrementSpaces($date)) {
                throw new \Exception('No se pudo actualizar los espacios disponibles');
            }

            // Persister la reserva
            $this->entityManager->persist($reservation);
            $this->entityManager->flush();
            $this->entityManager->commit();

            // Refrescar el espacio para obtener los datos actualizados
            $this->entityManager->refresh($space);

            // Publicar actualizaciones en tiempo real
            $this->syncService->publishSpaceUpdate($space);
            $this->syncService->publishReservationUpdate($reservation, 'created');

            // Enviar código de verificación por WhatsApp
            $this->sendVerificationCode($reservation);

            $this->logger->info('Reservation created successfully', [
                'reservation_id' => $reservation->getReservationId(),
                'date' => $reservation->getDateFormatted(),
                'phone' => $reservation->getPhone(),
                'spaces_remaining' => $space->getAvailableSpaces()
            ]);

            return [
                'success' => true,
                'reservation' => $reservation->toArray(),
                'spaces_remaining' => $space->getAvailableSpaces(),
                'verification_sent' => true
            ];

        } catch (\Exception $e) {
            $this->entityManager->rollback();
            
            $this->logger->error('Failed to create reservation', [
                'error' => $e->getMessage(),
                'data' => $reservationData
            ]);

            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Verificar código de verificación
     */
    public function verifyReservation(string $phone, string $code): array
    {
        try {
            $reservation = $this->reservationRepository->findByVerificationCode($code);

            if (!$reservation) {
                throw new \Exception('Código de verificación inválido');
            }

            if ($reservation->getPhone() !== $phone) {
                throw new \Exception('El teléfono no coincide con la reserva');
            }

            // Verificar la reserva
            $reservation->setIsVerified(true)
                       ->confirm();

            $this->entityManager->flush();

            // Publicar actualización
            $this->syncService->publishReservationUpdate($reservation, 'verified');

            // Enviar confirmación por WhatsApp
            $this->sendBookingConfirmation($reservation);

            $this->logger->info('Reservation verified successfully', [
                'reservation_id' => $reservation->getReservationId(),
                'phone' => $phone
            ]);

            return [
                'success' => true,
                'reservation' => $reservation->toArray()
            ];

        } catch (\Exception $e) {
            $this->logger->error('Failed to verify reservation', [
                'error' => $e->getMessage(),
                'phone' => $phone,
                'code' => $code
            ]);

            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Cancelar una reserva
     */
    public function cancelReservation(string $reservationId, string $reason = null): array
    {
        $this->entityManager->beginTransaction();

        try {
            $reservation = $this->reservationRepository->findByReservationId($reservationId);

            if (!$reservation) {
                throw new \Exception('Reserva no encontrada');
            }

            if ($reservation->isCancelled()) {
                throw new \Exception('La reserva ya está cancelada');
            }

            // Cancelar la reserva
            $reservation->cancel();
            if ($reason) {
                $reservation->setNotes(($reservation->getNotes() ?? '') . "\nCancelación: " . $reason);
            }

            // Incrementar espacios disponibles
            $date = $reservation->getDate();
            if (!$this->spaceRepository->incrementSpaces($date)) {
                $this->logger->warning('Could not increment spaces after cancellation', [
                    'reservation_id' => $reservationId,
                    'date' => $date->format('Y-m-d')
                ]);
            }

            $this->entityManager->flush();
            $this->entityManager->commit();

            // Obtener el espacio actualizado
            $space = $this->spaceRepository->findByDate($date);
            if ($space) {
                $this->syncService->publishSpaceUpdate($space);
            }

            $this->syncService->publishReservationUpdate($reservation, 'cancelled');

            $this->logger->info('Reservation cancelled successfully', [
                'reservation_id' => $reservationId,
                'reason' => $reason
            ]);

            return [
                'success' => true,
                'reservation' => $reservation->toArray(),
                'spaces_available' => $space ? $space->getAvailableSpaces() : 0
            ];

        } catch (\Exception $e) {
            $this->entityManager->rollback();
            
            $this->logger->error('Failed to cancel reservation', [
                'error' => $e->getMessage(),
                'reservation_id' => $reservationId
            ]);

            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Obtener espacios disponibles
     */
    public function getAvailableSpaces(\DateTime $fromDate = null): array
    {
        $fromDate = $fromDate ?? new \DateTime();
        
        // Solo obtener miércoles con disponibilidad
        $spaces = $this->spaceRepository->findWednesdaysWithAvailability($fromDate);
        
        $result = [];
        foreach ($spaces as $space) {
            $result[$space->getDateFormatted()] = $space->getAvailableSpaces();
        }

        return $result;
    }

    /**
     * Inicializar espacios para miércoles
     */
    public function initializeSpaces(int $weeksAhead = 12, int $spacesPerDay = 8): array
    {
        try {
            $spaces = $this->spaceRepository->initializeWednesdays($weeksAhead, $spacesPerDay);
            
            // Publicar actualización masiva
            $this->syncService->publishAllSpacesUpdate();

            $this->logger->info('Spaces initialized successfully', [
                'weeks_ahead' => $weeksAhead,
                'spaces_per_day' => $spacesPerDay,
                'total_dates' => count($spaces)
            ]);

            return [
                'success' => true,
                'spaces_created' => count($spaces),
                'spaces' => $this->getAvailableSpaces()
            ];

        } catch (\Exception $e) {
            $this->logger->error('Failed to initialize spaces', [
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Resetear todos los espacios a un valor específico
     */
    public function resetAllSpaces(int $spacesToSet = 8): array
    {
        try {
            $affectedRows = $this->spaceRepository->resetAllSpaces($spacesToSet);
            
            // Publicar actualización masiva
            $this->syncService->publishAllSpacesUpdate();
            $this->syncService->publishSyncNotification(
                "Espacios resetados a {$spacesToSet} para todas las fechas", 
                'success'
            );

            $this->logger->info('All spaces reset successfully', [
                'spaces_set' => $spacesToSet,
                'affected_rows' => $affectedRows
            ]);

            return [
                'success' => true,
                'affected_dates' => $affectedRows,
                'spaces_set' => $spacesToSet,
                'spaces' => $this->getAvailableSpaces()
            ];

        } catch (\Exception $e) {
            $this->logger->error('Failed to reset all spaces', [
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Obtener el espacio disponible con bloqueo para escritura
     */
    private function getAvailableSpaceWithLock(\DateTime $date): ?AvailableSpace
    {
        $connection = $this->entityManager->getConnection();
        
        // Usar SELECT FOR UPDATE para bloquear la fila
        $sql = 'SELECT * FROM available_spaces WHERE date = ? AND is_active = 1 FOR UPDATE';
        $stmt = $connection->prepare($sql);
        $result = $stmt->executeQuery([$date->format('Y-m-d')]);
        $row = $result->fetchAssociative();

        if (!$row) {
            return null;
        }

        return $this->spaceRepository->find($row['id']);
    }

    /**
     * Validar datos de reserva
     */
    private function validateReservationData(array $data): void
    {
        $required = ['date', 'clientName', 'phone', 'carBrand', 'carModel', 'carSize', 'services', 'price'];
        
        foreach ($required as $field) {
            if (!isset($data[$field]) || empty($data[$field])) {
                throw new \Exception("Campo requerido: {$field}");
            }
        }

        // Validar formato de teléfono
        if (!preg_match('/^\+34[6789]\d{8}$/', $data['phone'])) {
            throw new \Exception('Formato de teléfono inválido');
        }

        // Validar fecha
        $date = new \DateTime($data['date']);
        if ($date <= new \DateTime()) {
            throw new \Exception('La fecha debe ser futura');
        }

        // Validar que sea miércoles
        if ($date->format('N') !== '3') {
            throw new \Exception('Solo se permiten reservas para miércoles');
        }
    }

    /**
     * Verificar si ya existe una reserva duplicada
     */
    private function hasDuplicateReservation(string $phone, \DateTime $date): bool
    {
        return $this->reservationRepository->hasActiveReservation($date, $phone);
    }

    /**
     * Construir objeto de reserva
     */
    private function buildReservation(array $data, AvailableSpace $space): Reservation
    {
        $reservation = new Reservation();
        $reservation->setDate(new \DateTime($data['date']))
                   ->setClientName($data['clientName'])
                   ->setPhone($data['phone'])
                   ->setCarBrand($data['carBrand'])
                   ->setCarModel($data['carModel'])
                   ->setCarSize($data['carSize'])
                   ->setServices($data['services'])
                   ->setServiceNames($data['serviceNames'] ?? [])
                   ->setPrice((string) $data['price'])
                   ->setNotes($data['notes'] ?? null)
                   ->setDeviceId($data['deviceId'] ?? null)
                   ->setAvailableSpace($space)
                   ->generateVerificationCode();

        return $reservation;
    }

    /**
     * Enviar código de verificación
     */
    private function sendVerificationCode(Reservation $reservation): void
    {
        try {
            $this->whatsAppService->sendVerificationCode(
                $reservation->getPhone(),
                $reservation->getVerificationCode()
            );
        } catch (\Exception $e) {
            $this->logger->warning('Failed to send verification code', [
                'reservation_id' => $reservation->getReservationId(),
                'phone' => $reservation->getPhone(),
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Enviar confirmación de reserva
     */
    private function sendBookingConfirmation(Reservation $reservation): void
    {
        try {
            $this->whatsAppService->sendBookingConfirmation($reservation);
        } catch (\Exception $e) {
            $this->logger->warning('Failed to send booking confirmation', [
                'reservation_id' => $reservation->getReservationId(),
                'phone' => $reservation->getPhone(),
                'error' => $e->getMessage()
            ]);
        }
    }
} 