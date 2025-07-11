<?php

namespace App\Service;

use App\Entity\Reservation;
use Symfony\Contracts\HttpClient\HttpClientInterface;
use Psr\Log\LoggerInterface;

class WhatsAppService
{
    public function __construct(
        private HttpClientInterface $httpClient,
        private LoggerInterface $logger,
        private string $n8nWebhookUrl,
        private string $n8nValidationUrl
    ) {}

    /**
     * Enviar código de verificación por WhatsApp
     */
    public function sendVerificationCode(string $phone, string $code): bool
    {
        try {
            $message = "🔐 Código de verificación Errekalde Car Wash\n\n" .
                      "Tu código de verificación es: {$code}\n\n" .
                      "Este código es válido para acceder al sistema de reservas de SWAP ENERGIA.";

            $payload = [
                'phone' => $phone,
                'message' => $message,
                'type' => 'verification',
                'code' => $code,
                'timestamp' => time()
            ];

            $response = $this->httpClient->request('POST', $this->n8nValidationUrl, [
                'json' => $payload,
                'headers' => [
                    'Content-Type' => 'application/json',
                    'Cache-Control' => 'no-cache'
                ],
                'timeout' => 30
            ]);

            $statusCode = $response->getStatusCode();
            $success = $statusCode >= 200 && $statusCode < 400;

            $this->logger->info('Verification code sent', [
                'phone' => $phone,
                'status_code' => $statusCode,
                'success' => $success
            ]);

            return $success;

        } catch (\Exception $e) {
            $this->logger->error('Failed to send verification code', [
                'phone' => $phone,
                'error' => $e->getMessage()
            ]);

            return false;
        }
    }

    /**
     * Enviar confirmación de reserva por WhatsApp
     */
    public function sendBookingConfirmation(Reservation $reservation): bool
    {
        try {
            $message = $this->buildConfirmationMessage($reservation);

            $payload = [
                'phone' => $reservation->getPhone(),
                'message' => $message,
                'type' => 'booking',
                'reservationId' => $reservation->getReservationId(),
                'reservationData' => $this->buildReservationData($reservation),
                'timestamp' => time()
            ];

            $response = $this->httpClient->request('POST', $this->n8nWebhookUrl, [
                'json' => $payload,
                'headers' => [
                    'Content-Type' => 'application/json',
                    'Cache-Control' => 'no-cache'
                ],
                'timeout' => 30
            ]);

            $statusCode = $response->getStatusCode();
            $success = $statusCode >= 200 && $statusCode < 400;

            $this->logger->info('Booking confirmation sent', [
                'reservation_id' => $reservation->getReservationId(),
                'phone' => $reservation->getPhone(),
                'status_code' => $statusCode,
                'success' => $success
            ]);

            return $success;

        } catch (\Exception $e) {
            $this->logger->error('Failed to send booking confirmation', [
                'reservation_id' => $reservation->getReservationId(),
                'phone' => $reservation->getPhone(),
                'error' => $e->getMessage()
            ]);

            return false;
        }
    }

    /**
     * Enviar notificación de cancelación
     */
    public function sendCancellationNotification(Reservation $reservation, string $reason = null): bool
    {
        try {
            $message = "❌ *RESERVA CANCELADA - Errekalde Car Wash*\n\n" .
                      "Hola {$reservation->getClientName()}, tu reserva ha sido cancelada\n\n" .
                      "📅 *Fecha:* " . $reservation->getDate()->format('d/m/Y') . "\n" .
                      "🆔 *ID Reserva:* {$reservation->getReservationId()}\n" .
                      "🚗 *Vehículo:* {$reservation->getCarBrand()} {$reservation->getCarModel()}\n\n";

            if ($reason) {
                $message .= "📝 *Motivo:* {$reason}\n\n";
            }

            $message .= "Si necesitas hacer una nueva reserva, puedes acceder a:\n" .
                       "https://errekalde-car-wash.surge.sh/\n\n" .
                       "*¡Gracias por usar nuestro servicio!* 🤝";

            $payload = [
                'phone' => $reservation->getPhone(),
                'message' => $message,
                'type' => 'cancellation',
                'reservationId' => $reservation->getReservationId(),
                'reason' => $reason,
                'timestamp' => time()
            ];

            $response = $this->httpClient->request('POST', $this->n8nWebhookUrl, [
                'json' => $payload,
                'headers' => [
                    'Content-Type' => 'application/json',
                    'Cache-Control' => 'no-cache'
                ],
                'timeout' => 30
            ]);

            $statusCode = $response->getStatusCode();
            $success = $statusCode >= 200 && $statusCode < 400;

            $this->logger->info('Cancellation notification sent', [
                'reservation_id' => $reservation->getReservationId(),
                'phone' => $reservation->getPhone(),
                'status_code' => $statusCode,
                'success' => $success
            ]);

            return $success;

        } catch (\Exception $e) {
            $this->logger->error('Failed to send cancellation notification', [
                'reservation_id' => $reservation->getReservationId(),
                'phone' => $reservation->getPhone(),
                'error' => $e->getMessage()
            ]);

            return false;
        }
    }

    /**
     * Construir mensaje de confirmación de reserva
     */
    private function buildConfirmationMessage(Reservation $reservation): string
    {
        $date = $reservation->getDate();
        $dateFormatted = $date->format('l, d \d\e F \d\e Y');
        
        // Traducir día de la semana a español
        $dayTranslations = [
            'Monday' => 'lunes',
            'Tuesday' => 'martes', 
            'Wednesday' => 'miércoles',
            'Thursday' => 'jueves',
            'Friday' => 'viernes',
            'Saturday' => 'sábado',
            'Sunday' => 'domingo'
        ];
        
        $monthTranslations = [
            'January' => 'enero', 'February' => 'febrero', 'March' => 'marzo',
            'April' => 'abril', 'May' => 'mayo', 'June' => 'junio',
            'July' => 'julio', 'August' => 'agosto', 'September' => 'septiembre',
            'October' => 'octubre', 'November' => 'noviembre', 'December' => 'diciembre'
        ];

        $dateFormatted = str_replace(array_keys($dayTranslations), array_values($dayTranslations), $dateFormatted);
        $dateFormatted = str_replace(array_keys($monthTranslations), array_values($monthTranslations), $dateFormatted);

        // Procesar servicios
        $services = $reservation->getServiceNames();
        $serviciosTexto = !empty($services) ? implode(', ', $services) : 'Lavado completo';

        // Tamaño del coche
        $carSizeMap = [
            'small' => 'pequeño',
            'medium' => 'mediano', 
            'large' => 'grande'
        ];
        $carSizeText = $carSizeMap[$reservation->getCarSize()] ?? $reservation->getCarSize();

        $message = "🚗 *RESERVA CONFIRMADA - Errekalde Car Wash* 🚗\n\n" .
                  "✅ Hola {$reservation->getClientName()}, tu reserva está confirmada\n\n" .
                  "📅 *Fecha:* {$dateFormatted}\n" .
                  "🕐 *Entrega de llaves:* Entre las 8:00-9:00 en el pabellón\n\n" .
                  "👤 *Cliente:* {$reservation->getClientName()}\n" .
                  "📞 *Teléfono:* {$reservation->getPhone()}\n" .
                  "🚗 *Vehículo:* {$reservation->getCarBrand()} {$reservation->getCarModel()} ({$carSizeText})\n" .
                  "🧽 *Servicio:* {$serviciosTexto}\n" .
                  "💰 *Precio Total:* {$reservation->getPrice()}€\n" .
                  "🆔 *ID Reserva:* {$reservation->getReservationId()}\n\n";

        if ($reservation->getNotes()) {
            $message .= "📝 *Notas:* {$reservation->getNotes()}\n\n";
        }

        $message .= "📍 *IMPORTANTE - SOLO TRABAJADORES SWAP ENERGIA*\n" .
                   "🏢 *Ubicación:* Pabellón SWAP ENERGIA\n" .
                   "🔑 *Llaves:* Dejar en el pabellón entre 8:00-9:00\n" .
                   "🕐 *No hay horario específico de lavado*\n\n" .
                   "*¡Gracias por usar nuestro servicio!* 🤝\n\n" .
                   "_Servicio exclusivo para empleados SWAP ENERGIA_ ✨";

        return $message;
    }

    /**
     * Construir datos de reserva para N8N
     */
    private function buildReservationData(Reservation $reservation): array
    {
        return [
            'name' => $reservation->getClientName(),
            'phone' => $reservation->getPhone(),
            'date' => $reservation->getDate()->format('Y-m-d'),
            'dateFormatted' => $reservation->getDate()->format('d/m/Y'),
            'vehicle' => $reservation->getCarBrand() . ' ' . $reservation->getCarModel(),
            'carSize' => $reservation->getCarSize(),
            'services' => $reservation->getServices(),
            'serviceNames' => $reservation->getServiceNames(),
            'price' => $reservation->getPriceAsFloat(),
            'reservationId' => $reservation->getReservationId(),
            'notes' => $reservation->getNotes(),
            'deviceId' => $reservation->getDeviceId(),
            'createdAt' => $reservation->getCreatedAt()->format('c')
        ];
    }
} 