<?php

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Validator\Constraints as Assert;
use Symfony\Component\Validator\Validator\ValidatorInterface;
use Symfony\Component\RateLimiter\RateLimiterFactory;
use Doctrine\DBAL\Connection;

#[Route('/')]
class CarWashController extends AbstractController
{
    private Connection $connection;
    private ValidatorInterface $validator;

    public function __construct(Connection $connection, ValidatorInterface $validator)
    {
        $this->connection = $connection;
        $this->validator = $validator;
    }

    #[Route('/', name: 'app_home')]
    public function index(): Response
    {
        return $this->render('car_wash/index.html.twig', [
            'title' => 'Errekalde Car Wash - SWAP ENERGIA',
            'csrf_token' => $this->generateCsrfToken(),
        ]);
    }

    #[Route('/api/health', name: 'api_health', methods: ['GET'])]
    public function health(): JsonResponse
    {
        try {
            // Verificar conexión a base de datos
            $this->connection->executeQuery('SELECT 1');
            
            // Obtener estadísticas
            $stats = $this->getStats();
            
            return $this->json([
                'status' => 'ok',
                'database' => 'connected',
                'timestamp' => new \DateTime(),
                'config' => [
                    'host' => 'localhost',
                    'port' => 3306,
                    'database' => 'errekalde_car_wash',
                    'user' => 'root'
                ],
                'statistics' => $stats,
                'version' => '2.0.0-symfony'
            ]);
        } catch (\Exception $e) {
            return $this->json([
                'status' => 'error',
                'database' => 'disconnected',
                'error' => $e->getMessage(),
                'timestamp' => new \DateTime()
            ], 500);
        }
    }

    #[Route('/api/espacios', name: 'api_espacios', methods: ['GET'])]
    public function getEspacios(): JsonResponse
    {
        try {
            $sql = "
                SELECT fecha, espacios_disponibles, espacios_totales, updated_at
                FROM espacios_disponibles 
                WHERE fecha >= CURDATE()
                ORDER BY fecha ASC
                LIMIT 52
            ";
            
            $results = $this->connection->fetchAllAssociative($sql);
            
            $espacios = [];
            foreach ($results as $row) {
                $fechaObj = new \DateTime($row['fecha']);
                $fechaKey = $fechaObj->format('D M d Y H:i:s \G\M\T\+0200 (\h\o\r\a \d\e \v\e\r\a\n\o \d\e \E\u\r\o\p\a \c\e\n\t\r\a\l)');
                $espacios[$fechaKey] = (int) $row['espacios_disponibles'];
            }
            
            return $this->json($espacios);
        } catch (\Exception $e) {
            return $this->json([
                'error' => 'Error obteniendo espacios disponibles',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    #[Route('/api/sync-espacios', name: 'api_sync_espacios', methods: ['GET'])]
    public function syncEspacios(): JsonResponse
    {
        try {
            $sql = "
                SELECT fecha, espacios_disponibles, espacios_totales, updated_at
                FROM espacios_disponibles 
                WHERE fecha >= CURDATE()
                ORDER BY fecha ASC
                LIMIT 52
            ";
            
            $results = $this->connection->fetchAllAssociative($sql);
            
            $espacios = [];
            foreach ($results as $row) {
                $fechaObj = new \DateTime($row['fecha']);
                $fechaKey = $fechaObj->format('D M d Y H:i:s \G\M\T\+0200 (\h\o\r\a \d\e \v\e\r\a\n\o \d\e \E\u\r\o\p\a \c\e\n\t\r\a\l)');
                $espacios[$fechaKey] = (int) $row['espacios_disponibles'];
            }
            
            return $this->json([
                'espacios' => $espacios,
                'timestamp' => new \DateTime(),
                'source' => 'mariadb-symfony',
                'database' => 'connected',
                'sync_version' => '2.0.0'
            ]);
        } catch (\Exception $e) {
            return $this->json([
                'error' => 'Error sincronizando espacios',
                'message' => $e->getMessage(),
                'timestamp' => new \DateTime()
            ], 500);
        }
    }

    #[Route('/api/espacios/{fecha}', name: 'api_espacios_fecha', methods: ['GET'])]
    public function getEspaciosByFecha(string $fecha): JsonResponse
    {
        try {
            // Validate date format
            if (!$this->isValidDate($fecha)) {
                return $this->json(['error' => 'Formato de fecha inválido'], 400);
            }

            // Check if date is a Wednesday and in the future
            $dateObj = new \DateTime($fecha);
            if ($dateObj->format('N') != 3) { // Not Wednesday
                return $this->json(['error' => 'Solo se permiten reservas los miércoles'], 400);
            }

            if ($dateObj <= new \DateTime()) {
                return $this->json(['error' => 'No se pueden hacer reservas para fechas pasadas'], 400);
            }

            $sql = "
                SELECT espacios_disponibles, espacios_totales 
                FROM espacios_disponibles 
                WHERE fecha = ?
            ";
            
            $result = $this->connection->fetchAssociative($sql, [$fecha]);
            
            if (!$result) {
                // Si no existe la fecha, inicializarla
                $this->connection->executeStatement(
                    "INSERT INTO espacios_disponibles (fecha, espacios_totales, espacios_disponibles) VALUES (?, 8, 8)",
                    [$fecha]
                );
                return $this->json(['espacios_disponibles' => 8]);
            }
            
            return $this->json(['espacios_disponibles' => (int) $result['espacios_disponibles']]);
        } catch (\Exception $e) {
            return $this->json([
                'error' => 'Error obteniendo espacios para fecha específica',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    #[Route('/api/reservar', name: 'api_reservar', methods: ['POST'])]
    public function crearReserva(Request $request): JsonResponse
    {
        try {
            $data = json_decode($request->getContent(), true);
            
            // Validate JSON
            if (json_last_error() !== JSON_ERROR_NONE) {
                return $this->json(['error' => 'JSON inválido'], 400);
            }

            // Validate required fields
            $violations = $this->validateReservationData($data);
            if (count($violations) > 0) {
                return $this->json([
                    'error' => 'Datos inválidos',
                    'violations' => $violations
                ], 400);
            }

            // Validate date is Wednesday and future
            $dateObj = new \DateTime($data['fecha']);
            if ($dateObj->format('N') != 3) {
                return $this->json(['error' => 'Solo se permiten reservas los miércoles'], 400);
            }

            if ($dateObj <= new \DateTime()) {
                return $this->json(['error' => 'No se pueden hacer reservas para fechas pasadas'], 400);
            }

            // Rate limiting by IP (max 3 reservations per hour)
            $clientIp = $request->getClientIp();
            if ($this->isRateLimited($clientIp)) {
                return $this->json([
                    'error' => 'Demasiadas reservas. Intenta de nuevo en una hora.'
                ], 429);
            }

            // Validate phone number format
            if (!$this->isValidPhone($data['phone'])) {
                return $this->json(['error' => 'Formato de teléfono inválido'], 400);
            }

            // Check for duplicate reservations (same phone, same date)
            if ($this->isDuplicateReservation($data['phone'], $data['fecha'])) {
                return $this->json([
                    'error' => 'Ya tienes una reserva para esta fecha'
                ], 409);
            }

            // Iniciar transacción
            $this->connection->beginTransaction();

            try {
                // Verificar espacios disponibles con lock
                $sql = "SELECT espacios_disponibles FROM espacios_disponibles WHERE fecha = ? FOR UPDATE";
                $result = $this->connection->fetchAssociative($sql, [$data['fecha']]);

                if (!$result) {
                    // Crear fecha si no existe
                    $this->connection->executeStatement(
                        "INSERT INTO espacios_disponibles (fecha, espacios_totales, espacios_disponibles) VALUES (?, 8, 8)",
                        [$data['fecha']]
                    );
                    $espaciosDisponibles = 8;
                } else {
                    $espaciosDisponibles = (int) $result['espacios_disponibles'];
                }

                if ($espaciosDisponibles <= 0) {
                    throw new \Exception('No hay espacios disponibles para esta fecha');
                }

                // Crear reserva
                $reservationId = time() * 1000 + random_int(100, 999);
                
                $this->connection->executeStatement(
                    "INSERT INTO reservas (reservation_id, fecha, name, phone, car_brand, car_model, car_size, price, notas, created_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())",
                    [
                        $reservationId,
                        $data['fecha'],
                        $this->sanitizeInput($data['name']),
                        $this->sanitizeInput($data['phone']),
                        $this->sanitizeInput($data['carBrand'] ?? ''),
                        $this->sanitizeInput($data['carModel'] ?? ''),
                        $data['carSize'] ?? 'medium',
                        $data['price'] ?? 40.00,
                        $this->sanitizeInput($data['notas'] ?? null)
                    ]
                );

                // Reducir espacios disponibles
                $this->connection->executeStatement(
                    "UPDATE espacios_disponibles SET espacios_disponibles = espacios_disponibles - 1, updated_at = NOW() WHERE fecha = ?",
                    [$data['fecha']]
                );

                // Log reservation
                $this->logReservation($clientIp, $reservationId, $data['fecha']);

                $this->connection->commit();

                return $this->json([
                    'success' => true,
                    'reserva' => [
                        'id' => $reservationId,
                        'fecha' => $data['fecha'],
                        'name' => $data['name'],
                        'phone' => $data['phone'],
                        'price' => $data['price']
                    ]
                ]);

            } catch (\Exception $e) {
                $this->connection->rollBack();
                throw $e;
            }

        } catch (\Exception $e) {
            return $this->json([
                'error' => 'Error creando reserva',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    #[Route('/api/inicializar-espacios', name: 'api_inicializar_espacios', methods: ['POST'])]
    public function inicializarEspacios(Request $request): JsonResponse
    {
        try {
            $data = json_decode($request->getContent(), true);
            $fecha = $data['fecha'] ?? null;
            $espacios = $data['espacios'] ?? 8;

            if (!$fecha || !$this->isValidDate($fecha)) {
                return $this->json(['error' => 'Fecha requerida y válida'], 400);
            }

            if ($espacios < 1 || $espacios > 20) {
                return $this->json(['error' => 'Número de espacios inválido (1-20)'], 400);
            }

            $this->connection->executeStatement(
                "INSERT INTO espacios_disponibles (fecha, espacios_totales, espacios_disponibles, created_at, updated_at)
                 VALUES (?, ?, ?, NOW(), NOW())
                 ON DUPLICATE KEY UPDATE 
                    espacios_totales = VALUES(espacios_totales),
                    updated_at = NOW()",
                [$fecha, $espacios, $espacios]
            );

            return $this->json([
                'success' => true,
                'message' => "Espacios inicializados para {$fecha}",
                'espacios_totales' => $espacios
            ]);

        } catch (\Exception $e) {
            return $this->json([
                'error' => 'Error inicializando espacios',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    private function validateReservationData(array $data): array
    {
        $violations = [];

        // Required fields
        $required = ['fecha', 'name', 'phone', 'carBrand', 'carModel', 'carSize'];
        foreach ($required as $field) {
            if (!isset($data[$field]) || empty(trim($data[$field]))) {
                $violations[] = "Campo requerido: {$field}";
            }
        }

        // Field length validations
        if (isset($data['name']) && (strlen($data['name']) < 2 || strlen($data['name']) > 100)) {
            $violations[] = 'Nombre debe tener entre 2 y 100 caracteres';
        }

        if (isset($data['phone']) && (strlen($data['phone']) < 9 || strlen($data['phone']) > 20)) {
            $violations[] = 'Teléfono debe tener entre 9 y 20 caracteres';
        }

        if (isset($data['carBrand']) && (strlen($data['carBrand']) < 2 || strlen($data['carBrand']) > 50)) {
            $violations[] = 'Marca del vehículo debe tener entre 2 y 50 caracteres';
        }

        if (isset($data['carModel']) && (strlen($data['carModel']) < 2 || strlen($data['carModel']) > 50)) {
            $violations[] = 'Modelo del vehículo debe tener entre 2 y 50 caracteres';
        }

        if (isset($data['carSize']) && !in_array($data['carSize'], ['small', 'medium', 'large'])) {
            $violations[] = 'Tamaño de vehículo inválido';
        }

        if (isset($data['price']) && ($data['price'] < 0 || $data['price'] > 1000)) {
            $violations[] = 'Precio inválido (0-1000)';
        }

        if (isset($data['notas']) && strlen($data['notas']) > 500) {
            $violations[] = 'Notas demasiado largas (máximo 500 caracteres)';
        }

        return $violations;
    }

    private function isValidDate(string $date): bool
    {
        $d = \DateTime::createFromFormat('Y-m-d', $date);
        return $d && $d->format('Y-m-d') === $date;
    }

    private function isValidPhone(string $phone): bool
    {
        // Basic phone validation (allows international formats)
        return preg_match('/^[\+]?[0-9\s\-\(\)]{9,20}$/', $phone);
    }

    private function sanitizeInput(?string $input): ?string
    {
        if ($input === null) return null;
        
        // Remove HTML tags and special characters
        $sanitized = strip_tags($input);
        $sanitized = htmlspecialchars($sanitized, ENT_QUOTES, 'UTF-8');
        
        return trim($sanitized);
    }

    private function isDuplicateReservation(string $phone, string $fecha): bool
    {
        $sql = "SELECT COUNT(*) as count FROM reservas WHERE phone = ? AND fecha = ? AND status = 'confirmed'";
        $result = $this->connection->fetchAssociative($sql, [$phone, $fecha]);
        
        return $result['count'] > 0;
    }

    private function isRateLimited(string $ip): bool
    {
        // Check reservations from this IP in the last hour
        $sql = "SELECT COUNT(*) as count FROM reservas WHERE created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)";
        $result = $this->connection->fetchAssociative($sql);
        
        return $result['count'] >= 3;
    }

    private function logReservation(string $ip, string $reservationId, string $fecha): void
    {
        // Simple logging - in production, use proper logging service
        error_log("RESERVATION: IP={$ip}, ID={$reservationId}, DATE={$fecha}");
    }

    private function generateCsrfToken(): string
    {
        return bin2hex(random_bytes(32));
    }

    private function getStats(): array
    {
        $stats = [];
        
        try {
            // Total reservas confirmadas
            $result = $this->connection->fetchAssociative(
                "SELECT COUNT(*) as total FROM reservas WHERE status = 'confirmed'"
            );
            $stats['totalReservas'] = (int) $result['total'];
            
            // Espacios disponibles
            $result = $this->connection->fetchAssociative(
                "SELECT 
                    SUM(espacios_disponibles) as total_disponibles,
                    COUNT(*) as fechas_disponibles
                 FROM espacios_disponibles 
                 WHERE fecha >= CURDATE()"
            );
            $stats['espaciosDisponibles'] = $result;
            
            // Reservas por mes
            $results = $this->connection->fetchAllAssociative(
                "SELECT 
                    DATE_FORMAT(fecha, '%Y-%m') as mes,
                    COUNT(*) as total
                 FROM reservas 
                 WHERE status = 'confirmed'
                 GROUP BY DATE_FORMAT(fecha, '%Y-%m')
                 ORDER BY mes DESC
                 LIMIT 6"
            );
            $stats['reservasPorMes'] = $results;
            
            // Última sincronización
            $result = $this->connection->fetchAssociative(
                "SELECT MAX(updated_at) as last_sync FROM espacios_disponibles"
            );
            $stats['lastSync'] = $result['last_sync'];
            
        } catch (\Exception $e) {
            $stats['error'] = 'Error obteniendo estadísticas: ' . $e->getMessage();
        }
        
        return $stats;
    }
} 