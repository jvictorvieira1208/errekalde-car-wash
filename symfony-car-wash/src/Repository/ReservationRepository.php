<?php

namespace App\Repository;

use App\Entity\Reservation;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Reservation>
 */
class ReservationRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Reservation::class);
    }

    /**
     * Buscar reserva por ID de reserva
     */
    public function findByReservationId(string $reservationId): ?Reservation
    {
        return $this->createQueryBuilder('r')
            ->andWhere('r.reservationId = :reservationId')
            ->setParameter('reservationId', $reservationId)
            ->getQuery()
            ->getOneOrNullResult();
    }

    /**
     * Buscar reservas por fecha
     */
    public function findByDate(\DateTimeInterface $date): array
    {
        return $this->createQueryBuilder('r')
            ->andWhere('r.date = :date')
            ->setParameter('date', $date)
            ->orderBy('r.createdAt', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Buscar reservas por teléfono
     */
    public function findByPhone(string $phone): array
    {
        return $this->createQueryBuilder('r')
            ->andWhere('r.phone = :phone')
            ->setParameter('phone', $phone)
            ->orderBy('r.createdAt', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Buscar reservas por estado
     */
    public function findByStatus(string $status): array
    {
        return $this->createQueryBuilder('r')
            ->andWhere('r.status = :status')
            ->setParameter('status', $status)
            ->orderBy('r.createdAt', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Buscar reservas confirmadas por fecha
     */
    public function findConfirmedByDate(\DateTimeInterface $date): array
    {
        return $this->createQueryBuilder('r')
            ->andWhere('r.date = :date')
            ->andWhere('r.status = :status')
            ->setParameter('date', $date)
            ->setParameter('status', Reservation::STATUS_CONFIRMED)
            ->orderBy('r.createdAt', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Contar reservas por fecha y estado
     */
    public function countByDateAndStatus(\DateTimeInterface $date, string $status): int
    {
        return $this->createQueryBuilder('r')
            ->select('COUNT(r.id)')
            ->andWhere('r.date = :date')
            ->andWhere('r.status = :status')
            ->setParameter('date', $date)
            ->setParameter('status', $status)
            ->getQuery()
            ->getSingleScalarResult();
    }

    /**
     * Contar reservas confirmadas por fecha
     */
    public function countConfirmedByDate(\DateTimeInterface $date): int
    {
        return $this->countByDateAndStatus($date, Reservation::STATUS_CONFIRMED);
    }

    /**
     * Buscar reservas en un rango de fechas
     */
    public function findByDateRange(\DateTimeInterface $startDate, \DateTimeInterface $endDate): array
    {
        return $this->createQueryBuilder('r')
            ->andWhere('r.date >= :startDate')
            ->andWhere('r.date <= :endDate')
            ->setParameter('startDate', $startDate)
            ->setParameter('endDate', $endDate)
            ->orderBy('r.date', 'ASC')
            ->addOrderBy('r.createdAt', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Buscar reservas recientes (últimas 24 horas)
     */
    public function findRecent(): array
    {
        $yesterday = new \DateTime('-24 hours');
        
        return $this->createQueryBuilder('r')
            ->andWhere('r.createdAt >= :yesterday')
            ->setParameter('yesterday', $yesterday)
            ->orderBy('r.createdAt', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Buscar reservas pendientes de verificación
     */
    public function findPendingVerification(): array
    {
        return $this->createQueryBuilder('r')
            ->andWhere('r.isVerified = :isVerified')
            ->andWhere('r.status = :status')
            ->setParameter('isVerified', false)
            ->setParameter('status', Reservation::STATUS_PENDING)
            ->orderBy('r.createdAt', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Buscar reservas por código de verificación
     */
    public function findByVerificationCode(string $code): ?Reservation
    {
        return $this->createQueryBuilder('r')
            ->andWhere('r.verificationCode = :code')
            ->andWhere('r.isVerified = :isVerified')
            ->setParameter('code', $code)
            ->setParameter('isVerified', false)
            ->getQuery()
            ->getOneOrNullResult();
    }

    /**
     * Buscar reservas por device ID
     */
    public function findByDeviceId(string $deviceId): array
    {
        return $this->createQueryBuilder('r')
            ->andWhere('r.deviceId = :deviceId')
            ->setParameter('deviceId', $deviceId)
            ->orderBy('r.createdAt', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Verificar si existe una reserva activa para una fecha y teléfono
     */
    public function hasActiveReservation(\DateTimeInterface $date, string $phone): bool
    {
        $count = $this->createQueryBuilder('r')
            ->select('COUNT(r.id)')
            ->andWhere('r.date = :date')
            ->andWhere('r.phone = :phone')
            ->andWhere('r.status IN (:activeStatuses)')
            ->setParameter('date', $date)
            ->setParameter('phone', $phone)
            ->setParameter('activeStatuses', [
                Reservation::STATUS_PENDING,
                Reservation::STATUS_CONFIRMED
            ])
            ->getQuery()
            ->getSingleScalarResult();

        return $count > 0;
    }

    /**
     * Obtener estadísticas de reservas
     */
    public function getStatistics(): array
    {
        // Estadísticas básicas
        $basic = $this->createQueryBuilder('r')
            ->select('
                COUNT(r.id) as total,
                COUNT(CASE WHEN r.status = :confirmed THEN 1 END) as confirmed,
                COUNT(CASE WHEN r.status = :pending THEN 1 END) as pending,
                COUNT(CASE WHEN r.status = :cancelled THEN 1 END) as cancelled,
                COUNT(CASE WHEN r.isVerified = true THEN 1 END) as verified,
                AVG(r.price) as averagePrice,
                SUM(r.price) as totalRevenue
            ')
            ->setParameter('confirmed', Reservation::STATUS_CONFIRMED)
            ->setParameter('pending', Reservation::STATUS_PENDING)
            ->setParameter('cancelled', Reservation::STATUS_CANCELLED)
            ->getQuery()
            ->getSingleResult();

        // Reservas por tamaño de coche
        $carSizes = $this->createQueryBuilder('r')
            ->select('r.carSize, COUNT(r.id) as count')
            ->andWhere('r.status = :confirmed')
            ->setParameter('confirmed', Reservation::STATUS_CONFIRMED)
            ->groupBy('r.carSize')
            ->getQuery()
            ->getResult();

        // Reservas de hoy
        $today = new \DateTime();
        $todayCount = $this->countConfirmedByDate($today);

        return [
            'total' => (int) $basic['total'],
            'confirmed' => (int) $basic['confirmed'],
            'pending' => (int) $basic['pending'],
            'cancelled' => (int) $basic['cancelled'],
            'verified' => (int) $basic['verified'],
            'averagePrice' => round((float) $basic['averagePrice'], 2),
            'totalRevenue' => round((float) $basic['totalRevenue'], 2),
            'todayReservations' => $todayCount,
            'carSizeDistribution' => $carSizes
        ];
    }

    /**
     * Buscar duplicados potenciales (mismo teléfono, fecha similar)
     */
    public function findPotentialDuplicates(Reservation $reservation): array
    {
        $startDate = clone $reservation->getDate();
        $endDate = clone $reservation->getDate();
        $startDate->sub(new \DateInterval('P1D')); // 1 día antes
        $endDate->add(new \DateInterval('P1D'));   // 1 día después

        return $this->createQueryBuilder('r')
            ->andWhere('r.phone = :phone')
            ->andWhere('r.date >= :startDate')
            ->andWhere('r.date <= :endDate')
            ->andWhere('r.id != :excludeId')
            ->andWhere('r.status IN (:activeStatuses)')
            ->setParameter('phone', $reservation->getPhone())
            ->setParameter('startDate', $startDate)
            ->setParameter('endDate', $endDate)
            ->setParameter('excludeId', $reservation->getId() ?? 0)
            ->setParameter('activeStatuses', [
                Reservation::STATUS_PENDING,
                Reservation::STATUS_CONFIRMED
            ])
            ->orderBy('r.createdAt', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Limpiar reservas pendientes antiguas (más de 1 hora sin verificar)
     */
    public function cleanupOldPendingReservations(): int
    {
        $oneHourAgo = new \DateTime('-1 hour');
        
        $qb = $this->createQueryBuilder('r')
            ->delete()
            ->andWhere('r.status = :status')
            ->andWhere('r.isVerified = :isVerified')
            ->andWhere('r.createdAt < :oneHourAgo')
            ->setParameter('status', Reservation::STATUS_PENDING)
            ->setParameter('isVerified', false)
            ->setParameter('oneHourAgo', $oneHourAgo);

        return $qb->getQuery()->execute();
    }

    /**
     * Obtener reservas del día actual
     */
    public function findTodayReservations(): array
    {
        $today = new \DateTime();
        return $this->findConfirmedByDate($today);
    }

    /**
     * Obtener próximas reservas (próximos 7 días)
     */
    public function findUpcomingReservations(int $days = 7): array
    {
        $startDate = new \DateTime();
        $endDate = new \DateTime("+{$days} days");

        return $this->createQueryBuilder('r')
            ->andWhere('r.date >= :startDate')
            ->andWhere('r.date <= :endDate')
            ->andWhere('r.status = :status')
            ->setParameter('startDate', $startDate)
            ->setParameter('endDate', $endDate)
            ->setParameter('status', Reservation::STATUS_CONFIRMED)
            ->orderBy('r.date', 'ASC')
            ->addOrderBy('r.createdAt', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Convertir reservas a array para JSON
     */
    public function findAsArray(array $criteria = []): array
    {
        $qb = $this->createQueryBuilder('r');

        foreach ($criteria as $field => $value) {
            if ($value !== null) {
                $qb->andWhere("r.{$field} = :{$field}")
                   ->setParameter($field, $value);
            }
        }

        $reservations = $qb->orderBy('r.createdAt', 'DESC')
                          ->getQuery()
                          ->getResult();

        return array_map(fn(Reservation $r) => $r->toArray(), $reservations);
    }
} 