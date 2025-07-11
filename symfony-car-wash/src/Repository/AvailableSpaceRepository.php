<?php

namespace App\Repository;

use App\Entity\AvailableSpace;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\ORM\QueryBuilder;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<AvailableSpace>
 */
class AvailableSpaceRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, AvailableSpace::class);
    }

    /**
     * Obtener espacios disponibles por fecha
     */
    public function findByDate(\DateTimeInterface $date): ?AvailableSpace
    {
        return $this->createQueryBuilder('a')
            ->andWhere('a.date = :date')
            ->andWhere('a.isActive = :isActive')
            ->setParameter('date', $date)
            ->setParameter('isActive', true)
            ->getQuery()
            ->getOneOrNullResult();
    }

    /**
     * Obtener todos los espacios disponibles activos ordenados por fecha
     */
    public function findAllActiveSpaces(): array
    {
        return $this->createQueryBuilder('a')
            ->andWhere('a.isActive = :isActive')
            ->setParameter('isActive', true)
            ->orderBy('a.date', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Obtener espacios disponibles desde una fecha específica
     */
    public function findFromDate(\DateTimeInterface $fromDate): array
    {
        return $this->createQueryBuilder('a')
            ->andWhere('a.date >= :fromDate')
            ->andWhere('a.isActive = :isActive')
            ->setParameter('fromDate', $fromDate)
            ->setParameter('isActive', true)
            ->orderBy('a.date', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Obtener espacios disponibles en un rango de fechas
     */
    public function findByDateRange(\DateTimeInterface $startDate, \DateTimeInterface $endDate): array
    {
        return $this->createQueryBuilder('a')
            ->andWhere('a.date >= :startDate')
            ->andWhere('a.date <= :endDate')
            ->andWhere('a.isActive = :isActive')
            ->setParameter('startDate', $startDate)
            ->setParameter('endDate', $endDate)
            ->setParameter('isActive', true)
            ->orderBy('a.date', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Obtener solo miércoles disponibles
     */
    public function findWednesdays(\DateTimeInterface $fromDate = null): array
    {
        $qb = $this->createQueryBuilder('a')
            ->andWhere('a.isActive = :isActive')
            ->setParameter('isActive', true);

        if ($fromDate) {
            $qb->andWhere('a.date >= :fromDate')
               ->setParameter('fromDate', $fromDate);
        }

        // Filtrar solo miércoles (día de la semana = 3)
        $qb->andWhere('DAYOFWEEK(a.date) = 4'); // MySQL: 1=Sunday, 4=Wednesday

        return $qb->orderBy('a.date', 'ASC')
                  ->getQuery()
                  ->getResult();
    }

    /**
     * Obtener espacios con disponibilidad (espacios > 0)
     */
    public function findWithAvailability(): array
    {
        return $this->createQueryBuilder('a')
            ->andWhere('a.availableSpaces > 0')
            ->andWhere('a.isActive = :isActive')
            ->setParameter('isActive', true)
            ->orderBy('a.date', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Obtener miércoles con disponibilidad
     */
    public function findWednesdaysWithAvailability(\DateTimeInterface $fromDate = null): array
    {
        $qb = $this->createQueryBuilder('a')
            ->andWhere('a.availableSpaces > 0')
            ->andWhere('a.isActive = :isActive')
            ->setParameter('isActive', true);

        if ($fromDate) {
            $qb->andWhere('a.date >= :fromDate')
               ->setParameter('fromDate', $fromDate);
        }

        // Filtrar solo miércoles
        $qb->andWhere('DAYOFWEEK(a.date) = 4');

        return $qb->orderBy('a.date', 'ASC')
                  ->getQuery()
                  ->getResult();
    }

    /**
     * Decrementar espacios disponibles de forma atómica
     */
    public function decrementSpaces(\DateTimeInterface $date): bool
    {
        $connection = $this->getEntityManager()->getConnection();
        
        $sql = '
            UPDATE available_spaces 
            SET available_spaces = available_spaces - 1, 
                updated_at = NOW() 
            WHERE date = :date 
              AND available_spaces > 0 
              AND is_active = 1
        ';

        $result = $connection->executeStatement($sql, [
            'date' => $date->format('Y-m-d')
        ]);

        return $result > 0;
    }

    /**
     * Incrementar espacios disponibles de forma atómica
     */
    public function incrementSpaces(\DateTimeInterface $date): bool
    {
        $connection = $this->getEntityManager()->getConnection();
        
        $sql = '
            UPDATE available_spaces 
            SET available_spaces = available_spaces + 1, 
                updated_at = NOW() 
            WHERE date = :date 
              AND available_spaces < total_spaces 
              AND is_active = 1
        ';

        $result = $connection->executeStatement($sql, [
            'date' => $date->format('Y-m-d')
        ]);

        return $result > 0;
    }

    /**
     * Crear o actualizar espacios para una fecha
     */
    public function createOrUpdateSpaces(\DateTimeInterface $date, int $totalSpaces, int $availableSpaces = null): AvailableSpace
    {
        $space = $this->findByDate($date);
        
        if (!$space) {
            $space = new AvailableSpace();
            $space->setDate($date);
        }

        $space->setTotalSpaces($totalSpaces);
        $space->setAvailableSpaces($availableSpaces ?? $totalSpaces);

        $this->getEntityManager()->persist($space);
        $this->getEntityManager()->flush();

        return $space;
    }

    /**
     * Inicializar miércoles para las próximas semanas
     */
    public function initializeWednesdays(int $weeksAhead = 12, int $spacesPerDay = 8): array
    {
        $spaces = [];
        $today = new \DateTime();
        
        for ($i = 0; $i < $weeksAhead; $i++) {
            // Calcular el próximo miércoles
            $wednesday = clone $today;
            $daysUntilWednesday = (3 - $today->format('N') + 7) % 7;
            $wednesday->add(new \DateInterval('P' . ($daysUntilWednesday + ($i * 7)) . 'D'));
            
            // Solo crear si es una fecha futura
            if ($wednesday > $today) {
                $space = $this->createOrUpdateSpaces($wednesday, $spacesPerDay);
                $spaces[] = $space;
            }
        }

        return $spaces;
    }

    /**
     * Obtener estadísticas de espacios
     */
    public function getStatistics(): array
    {
        $qb = $this->createQueryBuilder('a')
            ->select('
                COUNT(a.id) as totalDates,
                SUM(a.totalSpaces) as totalSpaces,
                SUM(a.availableSpaces) as availableSpaces,
                SUM(a.totalSpaces - a.availableSpaces) as reservedSpaces
            ')
            ->andWhere('a.isActive = :isActive')
            ->setParameter('isActive', true);

        $result = $qb->getQuery()->getSingleResult();

        return [
            'totalDates' => (int) $result['totalDates'],
            'totalSpaces' => (int) $result['totalSpaces'],
            'availableSpaces' => (int) $result['availableSpaces'],
            'reservedSpaces' => (int) $result['reservedSpaces'],
            'occupancyRate' => $result['totalSpaces'] > 0 
                ? round(($result['reservedSpaces'] / $result['totalSpaces']) * 100, 2) 
                : 0
        ];
    }

    /**
     * Resetear todos los espacios a un valor específico
     */
    public function resetAllSpaces(int $spacesToSet = 8): int
    {
        $connection = $this->getEntityManager()->getConnection();
        
        $sql = '
            UPDATE available_spaces 
            SET available_spaces = :spaces, 
                total_spaces = :spaces,
                updated_at = NOW() 
            WHERE is_active = 1
        ';

        return $connection->executeStatement($sql, [
            'spaces' => $spacesToSet
        ]);
    }

    /**
     * Obtener espacios como array para JSON
     */
    public function findAllAsArray(): array
    {
        $spaces = $this->findAllActiveSpaces();
        $result = [];

        foreach ($spaces as $space) {
            $result[$space->getDateFormatted()] = $space->getAvailableSpaces();
        }

        return $result;
    }
} 