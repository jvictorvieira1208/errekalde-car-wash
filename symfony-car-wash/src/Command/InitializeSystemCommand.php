<?php

namespace App\Command;

use App\Service\ReservationService;
use App\Repository\AvailableSpaceRepository;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(
    name: 'car-wash:initialize',
    description: 'Inicializar sistema de reservas Errekalde Car Wash'
)]
class InitializeSystemCommand extends Command
{
    public function __construct(
        private ReservationService $reservationService,
        private AvailableSpaceRepository $spaceRepository
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this
            ->addOption('weeks', 'w', InputOption::VALUE_OPTIONAL, 'Número de semanas hacia adelante', 12)
            ->addOption('spaces', 's', InputOption::VALUE_OPTIONAL, 'Espacios por día', 8)
            ->addOption('reset', 'r', InputOption::VALUE_NONE, 'Resetear todos los espacios existentes')
            ->setHelp('Este comando inicializa el sistema de reservas creando espacios disponibles para miércoles.');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        
        $io->title('🚗 Inicializando Sistema Errekalde Car Wash');
        
        $weeksAhead = (int) $input->getOption('weeks');
        $spacesPerDay = (int) $input->getOption('spaces');
        $reset = $input->getOption('reset');

        $io->section('Configuración');
        $io->table(
            ['Parámetro', 'Valor'],
            [
                ['Semanas hacia adelante', $weeksAhead],
                ['Espacios por miércoles', $spacesPerDay],
                ['Resetear espacios', $reset ? 'Sí' : 'No']
            ]
        );

        try {
            // Resetear espacios si se solicita
            if ($reset) {
                $io->note('Reseteando todos los espacios existentes...');
                $result = $this->reservationService->resetAllSpaces($spacesPerDay);
                
                if ($result['success']) {
                    $io->success("✅ Espacios reseteados: {$result['affected_dates']} fechas");
                } else {
                    $io->error("❌ Error reseteando espacios: {$result['error']}");
                    return Command::FAILURE;
                }
            }

            // Inicializar espacios para miércoles
            $io->note('Inicializando espacios para miércoles...');
            $result = $this->reservationService->initializeSpaces($weeksAhead, $spacesPerDay);

            if ($result['success']) {
                $io->success("✅ Espacios inicializados: {$result['spaces_created']} miércoles creados");
                
                // Mostrar espacios creados
                $io->section('Espacios Disponibles');
                $spaces = $result['spaces'];
                $tableData = [];
                
                foreach ($spaces as $date => $availableSpaces) {
                    $dateObj = new \DateTime($date);
                    $tableData[] = [
                        $date,
                        $dateObj->format('l, j \d\e F'),
                        $availableSpaces,
                        $spacesPerDay
                    ];
                }
                
                $io->table(
                    ['Fecha', 'Día', 'Disponibles', 'Total'],
                    $tableData
                );

                // Mostrar estadísticas
                $statistics = $this->spaceRepository->getStatistics();
                $io->section('Estadísticas del Sistema');
                $io->table(
                    ['Métrica', 'Valor'],
                    [
                        ['Total de fechas', $statistics['totalDates']],
                        ['Total de espacios', $statistics['totalSpaces']],
                        ['Espacios disponibles', $statistics['availableSpaces']],
                        ['Espacios reservados', $statistics['reservedSpaces']],
                        ['Tasa de ocupación', $statistics['occupancyRate'] . '%']
                    ]
                );

                $io->success('🎉 Sistema inicializado correctamente');
                
                // Mostrar URLs útiles
                $io->section('URLs del Sistema');
                $io->listing([
                    'Frontend: http://localhost:8000',
                    'API Health: http://localhost:8000/api/health',
                    'API Espacios: http://localhost:8000/api/espacios',
                    'Admin Panel: http://localhost:8000/admin'
                ]);

                return Command::SUCCESS;

            } else {
                $io->error("❌ Error inicializando espacios: {$result['error']}");
                return Command::FAILURE;
            }

        } catch (\Exception $e) {
            $io->error("💥 Error fatal: {$e->getMessage()}");
            return Command::FAILURE;
        }
    }
} 