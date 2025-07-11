<?php

namespace App\Service;

use App\Entity\AvailableSpace;
use App\Entity\Reservation;
use App\Repository\AvailableSpaceRepository;
use Symfony\Component\Mercure\HubInterface;
use Symfony\Component\Mercure\Update;
use Symfony\Component\Serializer\SerializerInterface;
use Psr\Log\LoggerInterface;

class RealtimeSyncService
{
    public function __construct(
        private HubInterface $hub,
        private SerializerInterface $serializer,
        private AvailableSpaceRepository $spaceRepository,
        private LoggerInterface $logger
    ) {}

    /**
     * Publicar actualización de espacios disponibles
     */
    public function publishSpaceUpdate(AvailableSpace $space): void
    {
        try {
            $data = [
                'type' => 'space_update',
                'space' => $space->toArray(),
                'timestamp' => (new \DateTime())->format('c'),
                'hash' => $this->generateSpaceHash($space)
            ];

            $update = new Update(
                'car-wash/spaces',
                $this->serializer->serialize($data, 'json'),
                private: false
            );

            $this->hub->publish($update);
            
            $this->logger->info('Space update published', [
                'date' => $space->getDateFormatted(),
                'availableSpaces' => $space->getAvailableSpaces()
            ]);

        } catch (\Exception $e) {
            $this->logger->error('Failed to publish space update', [
                'error' => $e->getMessage(),
                'space_id' => $space->getId()
            ]);
        }
    }

    /**
     * Publicar actualización masiva de espacios
     */
    public function publishAllSpacesUpdate(): void
    {
        try {
            $spaces = $this->spaceRepository->findAllActiveSpaces();
            $spacesArray = [];
            
            foreach ($spaces as $space) {
                $spacesArray[$space->getDateFormatted()] = $space->getAvailableSpaces();
            }

            $data = [
                'type' => 'all_spaces_update',
                'spaces' => $spacesArray,
                'timestamp' => (new \DateTime())->format('c'),
                'total_dates' => count($spacesArray),
                'hash' => $this->generateAllSpacesHash($spaces)
            ];

            $update = new Update(
                'car-wash/spaces',
                $this->serializer->serialize($data, 'json'),
                private: false
            );

            $this->hub->publish($update);
            
            $this->logger->info('All spaces update published', [
                'total_dates' => count($spacesArray),
                'total_spaces' => array_sum($spacesArray)
            ]);

        } catch (\Exception $e) {
            $this->logger->error('Failed to publish all spaces update', [
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Publicar nueva reserva
     */
    public function publishReservationUpdate(Reservation $reservation, string $action = 'created'): void
    {
        try {
            $data = [
                'type' => 'reservation_' . $action,
                'reservation' => $reservation->toArray(),
                'action' => $action,
                'timestamp' => (new \DateTime())->format('c')
            ];

            $update = new Update(
                'car-wash/reservations',
                $this->serializer->serialize($data, 'json'),
                private: false
            );

            $this->hub->publish($update);
            
            $this->logger->info('Reservation update published', [
                'reservation_id' => $reservation->getReservationId(),
                'action' => $action,
                'date' => $reservation->getDateFormatted()
            ]);

        } catch (\Exception $e) {
            $this->logger->error('Failed to publish reservation update', [
                'error' => $e->getMessage(),
                'reservation_id' => $reservation->getReservationId() ?? 'unknown'
            ]);
        }
    }

    /**
     * Publicar actualización de estado del sistema
     */
    public function publishSystemStatus(array $status): void
    {
        try {
            $data = [
                'type' => 'system_status',
                'status' => $status,
                'timestamp' => (new \DateTime())->format('c')
            ];

            $update = new Update(
                'car-wash/system',
                $this->serializer->serialize($data, 'json'),
                private: false
            );

            $this->hub->publish($update);
            
            $this->logger->info('System status published', $status);

        } catch (\Exception $e) {
            $this->logger->error('Failed to publish system status', [
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Publicar notificación de sincronización
     */
    public function publishSyncNotification(string $message, string $type = 'info'): void
    {
        try {
            $data = [
                'type' => 'sync_notification',
                'message' => $message,
                'notification_type' => $type,
                'timestamp' => (new \DateTime())->format('c')
            ];

            $update = new Update(
                'car-wash/notifications',
                $this->serializer->serialize($data, 'json'),
                private: false
            );

            $this->hub->publish($update);
            
            $this->logger->info('Sync notification published', [
                'message' => $message,
                'type' => $type
            ]);

        } catch (\Exception $e) {
            $this->logger->error('Failed to publish sync notification', [
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Publicar actualización de ocupación
     */
    public function publishOccupancyUpdate(): void
    {
        try {
            $statistics = $this->spaceRepository->getStatistics();
            
            $data = [
                'type' => 'occupancy_update',
                'statistics' => $statistics,
                'timestamp' => (new \DateTime())->format('c')
            ];

            $update = new Update(
                'car-wash/occupancy',
                $this->serializer->serialize($data, 'json'),
                private: false
            );

            $this->hub->publish($update);
            
            $this->logger->info('Occupancy update published', $statistics);

        } catch (\Exception $e) {
            $this->logger->error('Failed to publish occupancy update', [
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Generar hash para detectar cambios en un espacio específico
     */
    private function generateSpaceHash(AvailableSpace $space): string
    {
        return md5(sprintf(
            '%s_%d_%s',
            $space->getDateFormatted(),
            $space->getAvailableSpaces(),
            $space->getUpdatedAt()?->format('Y-m-d H:i:s')
        ));
    }

    /**
     * Generar hash para detectar cambios en todos los espacios
     */
    private function generateAllSpacesHash(array $spaces): string
    {
        $hashData = [];
        
        foreach ($spaces as $space) {
            $hashData[] = $this->generateSpaceHash($space);
        }
        
        return md5(implode('|', $hashData));
    }

    /**
     * Obtener configuración del cliente Mercure para el frontend
     */
    public function getClientConfig(): array
    {
        return [
            'mercure_url' => $_ENV['MERCURE_PUBLIC_URL'] ?? 'https://127.0.0.1:3000/.well-known/mercure',
            'topics' => [
                'spaces' => 'car-wash/spaces',
                'reservations' => 'car-wash/reservations',
                'system' => 'car-wash/system',
                'notifications' => 'car-wash/notifications',
                'occupancy' => 'car-wash/occupancy'
            ],
            'reconnect_interval' => 5000, // 5 segundos
            'max_retries' => 10
        ];
    }
} 