<?php

namespace App\Controller;

use App\Service\ReservationService;
use App\Service\RealtimeSyncService;
use App\Repository\AvailableSpaceRepository;
use App\Repository\ReservationRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\HttpFoundation\Response;
use Psr\Log\LoggerInterface;

#[Route('/api', name: 'api_')]
class ApiController extends AbstractController
{
    public function __construct(
        private ReservationService $reservationService,
        private RealtimeSyncService $syncService,
        private AvailableSpaceRepository $spaceRepository,
        private ReservationRepository $reservationRepository,
        private LoggerInterface $logger
    ) {}

    /**
     * Health check endpoint
     */
    #[Route('/health', name: 'health', methods: ['GET'])]
    public function health(): JsonResponse
    {
        try {
            // Verificar conexión a base de datos
            $this->spaceRepository->findOneBy([], ['id' => 'DESC']);
            
            return new JsonResponse([
                'status' => 'healthy',
                'timestamp' => (new \DateTime())->format('c'),
                'database' => 'connected',
                'mercure' => 'configured'
            ]);
        } catch (\Exception $e) {
            return new JsonResponse([
                'status' => 'unhealthy',
                'timestamp' => (new \DateTime())->format('c'),
                'error' => $e->getMessage()
            ], Response::HTTP_SERVICE_UNAVAILABLE);
        }
    }

    /**
     * Obtener espacios disponibles
     */
    #[Route('/espacios', name: 'get_spaces', methods: ['GET'])]
    public function getSpaces(Request $request): JsonResponse
    {
        try {
            $fromDate = null;
            if ($request->query->get('from')) {
                $fromDate = new \DateTime($request->query->get('from'));
            }

            $spaces = $this->reservationService->getAvailableSpaces($fromDate);
            $statistics = $this->spaceRepository->getStatistics();

            return new JsonResponse([
                'success' => true,
                'espacios' => $spaces,
                'statistics' => $statistics,
                'timestamp' => (new \DateTime())->format('c'),
                'total_fechas' => count($spaces)
            ]);

        } catch (\Exception $e) {
            $this->logger->error('Error getting spaces', ['error' => $e->getMessage()]);
            
            return new JsonResponse([
                'success' => false,
                'error' => $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Obtener espacios por fecha específica
     */
    #[Route('/espacios/{fecha}', name: 'get_spaces_by_date', methods: ['GET'])]
    public function getSpacesByDate(string $fecha): JsonResponse
    {
        try {
            $date = new \DateTime($fecha);
            $space = $this->spaceRepository->findByDate($date);

            if (!$space) {
                return new JsonResponse([
                    'success' => false,
                    'error' => 'No hay espacios configurados para esta fecha'
                ], Response::HTTP_NOT_FOUND);
            }

            return new JsonResponse([
                'success' => true,
                'space' => $space->toArray(),
                'reservations' => count($this->reservationRepository->findConfirmedByDate($date))
            ]);

        } catch (\Exception $e) {
            return new JsonResponse([
                'success' => false,
                'error' => 'Fecha inválida'
            ], Response::HTTP_BAD_REQUEST);
        }
    }

    /**
     * Crear nueva reserva
     */
    #[Route('/reservar', name: 'create_reservation', methods: ['POST'])]
    public function createReservation(Request $request): JsonResponse
    {
        try {
            $data = json_decode($request->getContent(), true);

            if (!$data) {
                return new JsonResponse([
                    'success' => false,
                    'error' => 'Datos JSON inválidos'
                ], Response::HTTP_BAD_REQUEST);
            }

            // Agregar headers para CORS
            $response = new JsonResponse($this->reservationService->createReservation($data));
            $this->addCorsHeaders($response);
            
            return $response;

        } catch (\Exception $e) {
            $this->logger->error('Error creating reservation', [
                'error' => $e->getMessage(),
                'data' => $request->getContent()
            ]);

            $response = new JsonResponse([
                'success' => false,
                'error' => $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
            
            $this->addCorsHeaders($response);
            return $response;
        }
    }

    /**
     * Verificar código de reserva
     */
    #[Route('/verificar', name: 'verify_reservation', methods: ['POST'])]
    public function verifyReservation(Request $request): JsonResponse
    {
        try {
            $data = json_decode($request->getContent(), true);

            if (!isset($data['phone']) || !isset($data['code'])) {
                return new JsonResponse([
                    'success' => false,
                    'error' => 'Teléfono y código son requeridos'
                ], Response::HTTP_BAD_REQUEST);
            }

            $response = new JsonResponse($this->reservationService->verifyReservation(
                $data['phone'],
                $data['code']
            ));
            
            $this->addCorsHeaders($response);
            return $response;

        } catch (\Exception $e) {
            $this->logger->error('Error verifying reservation', [
                'error' => $e->getMessage()
            ]);

            $response = new JsonResponse([
                'success' => false,
                'error' => $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
            
            $this->addCorsHeaders($response);
            return $response;
        }
    }

    /**
     * Cancelar reserva
     */
    #[Route('/cancelar/{reservationId}', name: 'cancel_reservation', methods: ['DELETE', 'POST'])]
    public function cancelReservation(string $reservationId, Request $request): JsonResponse
    {
        try {
            $data = json_decode($request->getContent(), true);
            $reason = $data['reason'] ?? null;

            $response = new JsonResponse($this->reservationService->cancelReservation($reservationId, $reason));
            $this->addCorsHeaders($response);
            
            return $response;

        } catch (\Exception $e) {
            $this->logger->error('Error cancelling reservation', [
                'error' => $e->getMessage(),
                'reservation_id' => $reservationId
            ]);

            $response = new JsonResponse([
                'success' => false,
                'error' => $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
            
            $this->addCorsHeaders($response);
            return $response;
        }
    }

    /**
     * Sincronización global de espacios
     */
    #[Route('/sync-espacios', name: 'sync_spaces', methods: ['GET', 'POST'])]
    public function syncSpaces(): JsonResponse
    {
        try {
            $spaces = $this->reservationService->getAvailableSpaces();
            
            // Publicar actualización en tiempo real
            $this->syncService->publishAllSpacesUpdate();

            $response = new JsonResponse([
                'success' => true,
                'espacios' => $spaces,
                'timestamp' => (new \DateTime())->format('c'),
                'database' => 'mysql_centralized'
            ]);
            
            $this->addCorsHeaders($response);
            return $response;

        } catch (\Exception $e) {
            $this->logger->error('Error in sync spaces', ['error' => $e->getMessage()]);
            
            $response = new JsonResponse([
                'success' => false,
                'error' => $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
            
            $this->addCorsHeaders($response);
            return $response;
        }
    }

    /**
     * Inicializar espacios
     */
    #[Route('/inicializar-espacios', name: 'initialize_spaces', methods: ['POST'])]
    public function initializeSpaces(Request $request): JsonResponse
    {
        try {
            $data = json_decode($request->getContent(), true) ?? [];
            $weeksAhead = $data['weeks_ahead'] ?? 12;
            $spacesPerDay = $data['spaces_per_day'] ?? 8;

            $result = $this->reservationService->initializeSpaces($weeksAhead, $spacesPerDay);
            
            $response = new JsonResponse($result);
            $this->addCorsHeaders($response);
            
            return $response;

        } catch (\Exception $e) {
            $this->logger->error('Error initializing spaces', ['error' => $e->getMessage()]);
            
            $response = new JsonResponse([
                'success' => false,
                'error' => $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
            
            $this->addCorsHeaders($response);
            return $response;
        }
    }

    /**
     * Resetear todos los espacios
     */
    #[Route('/reset-espacios', name: 'reset_spaces', methods: ['POST'])]
    public function resetSpaces(Request $request): JsonResponse
    {
        try {
            $data = json_decode($request->getContent(), true) ?? [];
            $spacesToSet = $data['spaces'] ?? 8;

            $result = $this->reservationService->resetAllSpaces($spacesToSet);
            
            $response = new JsonResponse($result);
            $this->addCorsHeaders($response);
            
            return $response;

        } catch (\Exception $e) {
            $this->logger->error('Error resetting spaces', ['error' => $e->getMessage()]);
            
            $response = new JsonResponse([
                'success' => false,
                'error' => $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
            
            $this->addCorsHeaders($response);
            return $response;
        }
    }

    /**
     * Obtener estadísticas del sistema
     */
    #[Route('/estadisticas', name: 'get_statistics', methods: ['GET'])]
    public function getStatistics(): JsonResponse
    {
        try {
            $spaceStats = $this->spaceRepository->getStatistics();
            $reservationStats = $this->reservationRepository->getStatistics();

            return new JsonResponse([
                'success' => true,
                'spaces' => $spaceStats,
                'reservations' => $reservationStats,
                'timestamp' => (new \DateTime())->format('c')
            ]);

        } catch (\Exception $e) {
            $this->logger->error('Error getting statistics', ['error' => $e->getMessage()]);
            
            return new JsonResponse([
                'success' => false,
                'error' => $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Obtener configuración del cliente Mercure
     */
    #[Route('/mercure-config', name: 'mercure_config', methods: ['GET'])]
    public function getMercureConfig(): JsonResponse
    {
        $response = new JsonResponse($this->syncService->getClientConfig());
        $this->addCorsHeaders($response);
        
        return $response;
    }

    /**
     * Obtener reservas por teléfono
     */
    #[Route('/mis-reservas/{phone}', name: 'get_my_reservations', methods: ['GET'])]
    public function getMyReservations(string $phone): JsonResponse
    {
        try {
            $reservations = $this->reservationRepository->findByPhone($phone);
            $reservationsArray = array_map(fn($r) => $r->toArray(), $reservations);

            return new JsonResponse([
                'success' => true,
                'reservations' => $reservationsArray,
                'count' => count($reservations)
            ]);

        } catch (\Exception $e) {
            $this->logger->error('Error getting user reservations', [
                'error' => $e->getMessage(),
                'phone' => $phone
            ]);
            
            return new JsonResponse([
                'success' => false,
                'error' => $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Manejo de preflight CORS
     */
    #[Route('/reservar', name: 'reservar_options', methods: ['OPTIONS'])]
    #[Route('/verificar', name: 'verificar_options', methods: ['OPTIONS'])]
    #[Route('/sync-espacios', name: 'sync_options', methods: ['OPTIONS'])]
    public function corsOptions(): JsonResponse
    {
        $response = new JsonResponse(null, Response::HTTP_NO_CONTENT);
        $this->addCorsHeaders($response);
        
        return $response;
    }

    /**
     * Agregar headers CORS a la respuesta
     */
    private function addCorsHeaders(JsonResponse $response): void
    {
        $response->headers->set('Access-Control-Allow-Origin', $this->getParameter('car_wash.frontend_url'));
        $response->headers->set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        $response->headers->set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Cache-Control, Pragma');
        $response->headers->set('Access-Control-Allow-Credentials', 'true');
        $response->headers->set('Access-Control-Max-Age', '3600');
    }
} 