<?php

namespace App\Controller;

use App\Service\ReservationService;
use App\Service\RealtimeSyncService;
use App\Repository\AvailableSpaceRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

class HomeController extends AbstractController
{
    public function __construct(
        private ReservationService $reservationService,
        private RealtimeSyncService $syncService,
        private AvailableSpaceRepository $spaceRepository
    ) {}

    /**
     * Página principal del sistema de reservas
     */
    #[Route('/', name: 'home')]
    public function index(): Response
    {
        try {
            // Obtener espacios disponibles
            $spaces = $this->reservationService->getAvailableSpaces();
            
            // Obtener estadísticas
            $statistics = $this->spaceRepository->getStatistics();
            
            // Configuración Mercure para el frontend
            $mercureConfig = $this->syncService->getClientConfig();

            return $this->render('home/index.html.twig', [
                'spaces' => $spaces,
                'statistics' => $statistics,
                'mercure_config' => $mercureConfig,
                'api_base_url' => '/api',
                'current_date' => (new \DateTime())->format('Y-m-d'),
                'system_info' => [
                    'name' => 'Errekalde Car Wash',
                    'company' => 'SWAP ENERGIA',
                    'version' => '2.0-symfony',
                    'database' => 'MariaDB Centralizada'
                ]
            ]);

        } catch (\Exception $e) {
            return $this->render('error/system_error.html.twig', [
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Página de administración (opcional)
     */
    #[Route('/admin', name: 'admin')]
    public function admin(): Response
    {
        try {
            // Estadísticas completas
            $spaceStats = $this->spaceRepository->getStatistics();
            
            // Espacios disponibles
            $spaces = $this->reservationService->getAvailableSpaces();

            return $this->render('admin/dashboard.html.twig', [
                'spaces' => $spaces,
                'statistics' => $spaceStats,
                'mercure_config' => $this->syncService->getClientConfig()
            ]);

        } catch (\Exception $e) {
            return $this->render('error/system_error.html.twig', [
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Página de test del sistema
     */
    #[Route('/test', name: 'test')]
    public function test(): Response
    {
        return $this->render('test/system_test.html.twig', [
            'api_base_url' => '/api',
            'mercure_config' => $this->syncService->getClientConfig()
        ]);
    }
} 