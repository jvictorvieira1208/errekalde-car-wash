<?php

namespace App\Entity;

use App\Repository\ReservationRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: ReservationRepository::class)]
#[ORM\Table(name: 'reservations')]
#[ORM\Index(columns: ['date'], name: 'idx_reservation_date')]
#[ORM\Index(columns: ['phone'], name: 'idx_phone')]
#[ORM\Index(columns: ['status'], name: 'idx_status')]
#[ORM\Index(columns: ['created_at'], name: 'idx_created_at')]
class Reservation
{
    public const STATUS_PENDING = 'pending';
    public const STATUS_CONFIRMED = 'confirmed';
    public const STATUS_CANCELLED = 'cancelled';
    public const STATUS_COMPLETED = 'completed';

    public const CAR_SIZE_SMALL = 'small';
    public const CAR_SIZE_MEDIUM = 'medium';
    public const CAR_SIZE_LARGE = 'large';

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 255, unique: true)]
    #[Assert\NotBlank]
    #[Assert\Length(min: 10, max: 255)]
    private ?string $reservationId = null;

    #[ORM\Column(type: Types::DATE_MUTABLE)]
    #[Assert\NotNull]
    #[Assert\Type(\DateTimeInterface::class)]
    private ?\DateTimeInterface $date = null;

    #[ORM\Column(length: 255)]
    #[Assert\NotBlank]
    #[Assert\Length(min: 2, max: 255)]
    private ?string $clientName = null;

    #[ORM\Column(length: 20)]
    #[Assert\NotBlank]
    #[Assert\Regex('/^\+34[6789]\d{8}$/')]
    private ?string $phone = null;

    #[ORM\Column(length: 100)]
    #[Assert\NotBlank]
    #[Assert\Length(min: 2, max: 100)]
    private ?string $carBrand = null;

    #[ORM\Column(length: 100)]
    #[Assert\NotBlank]
    #[Assert\Length(min: 2, max: 100)]
    private ?string $carModel = null;

    #[ORM\Column(length: 20)]
    #[Assert\NotBlank]
    #[Assert\Choice(choices: [self::CAR_SIZE_SMALL, self::CAR_SIZE_MEDIUM, self::CAR_SIZE_LARGE])]
    private ?string $carSize = null;

    #[ORM\Column(type: Types::JSON)]
    private array $services = [];

    #[ORM\Column(type: Types::JSON)]
    private array $serviceNames = [];

    #[ORM\Column(type: Types::DECIMAL, precision: 8, scale: 2)]
    #[Assert\NotNull]
    #[Assert\Range(min: 0, max: 999.99)]
    private ?string $price = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[Assert\Length(max: 1000)]
    private ?string $notes = null;

    #[ORM\Column(length: 20)]
    #[Assert\Choice(choices: [self::STATUS_PENDING, self::STATUS_CONFIRMED, self::STATUS_CANCELLED, self::STATUS_COMPLETED])]
    private ?string $status = self::STATUS_PENDING;

    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    private ?\DateTimeInterface $createdAt = null;

    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    private ?\DateTimeInterface $updatedAt = null;

    #[ORM\Column(length: 6, nullable: true)]
    private ?string $verificationCode = null;

    #[ORM\Column]
    private ?bool $isVerified = false;

    #[ORM\Column(type: Types::DATETIME_MUTABLE, nullable: true)]
    private ?\DateTimeInterface $verifiedAt = null;

    #[ORM\Column(length: 50, nullable: true)]
    private ?string $deviceId = null;

    #[ORM\ManyToOne(targetEntity: AvailableSpace::class)]
    #[ORM\JoinColumn(name: 'available_space_id', referencedColumnName: 'id', onDelete: 'SET NULL')]
    private ?AvailableSpace $availableSpace = null;

    public function __construct()
    {
        $this->createdAt = new \DateTime();
        $this->updatedAt = new \DateTime();
        $this->status = self::STATUS_PENDING;
        $this->isVerified = false;
        $this->generateReservationId();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getReservationId(): ?string
    {
        return $this->reservationId;
    }

    public function setReservationId(string $reservationId): static
    {
        $this->reservationId = $reservationId;
        $this->updatedAt = new \DateTime();

        return $this;
    }

    public function getDate(): ?\DateTimeInterface
    {
        return $this->date;
    }

    public function setDate(\DateTimeInterface $date): static
    {
        $this->date = $date;
        $this->updatedAt = new \DateTime();

        return $this;
    }

    public function getClientName(): ?string
    {
        return $this->clientName;
    }

    public function setClientName(string $clientName): static
    {
        $this->clientName = $clientName;
        $this->updatedAt = new \DateTime();

        return $this;
    }

    public function getPhone(): ?string
    {
        return $this->phone;
    }

    public function setPhone(string $phone): static
    {
        $this->phone = $phone;
        $this->updatedAt = new \DateTime();

        return $this;
    }

    public function getCarBrand(): ?string
    {
        return $this->carBrand;
    }

    public function setCarBrand(string $carBrand): static
    {
        $this->carBrand = $carBrand;
        $this->updatedAt = new \DateTime();

        return $this;
    }

    public function getCarModel(): ?string
    {
        return $this->carModel;
    }

    public function setCarModel(string $carModel): static
    {
        $this->carModel = $carModel;
        $this->updatedAt = new \DateTime();

        return $this;
    }

    public function getCarSize(): ?string
    {
        return $this->carSize;
    }

    public function setCarSize(string $carSize): static
    {
        $this->carSize = $carSize;
        $this->updatedAt = new \DateTime();

        return $this;
    }

    public function getServices(): array
    {
        return $this->services;
    }

    public function setServices(array $services): static
    {
        $this->services = $services;
        $this->updatedAt = new \DateTime();

        return $this;
    }

    public function getServiceNames(): array
    {
        return $this->serviceNames;
    }

    public function setServiceNames(array $serviceNames): static
    {
        $this->serviceNames = $serviceNames;
        $this->updatedAt = new \DateTime();

        return $this;
    }

    public function getPrice(): ?string
    {
        return $this->price;
    }

    public function setPrice(string $price): static
    {
        $this->price = $price;
        $this->updatedAt = new \DateTime();

        return $this;
    }

    public function getNotes(): ?string
    {
        return $this->notes;
    }

    public function setNotes(?string $notes): static
    {
        $this->notes = $notes;
        $this->updatedAt = new \DateTime();

        return $this;
    }

    public function getStatus(): ?string
    {
        return $this->status;
    }

    public function setStatus(string $status): static
    {
        $this->status = $status;
        $this->updatedAt = new \DateTime();

        return $this;
    }

    public function getCreatedAt(): ?\DateTimeInterface
    {
        return $this->createdAt;
    }

    public function setCreatedAt(\DateTimeInterface $createdAt): static
    {
        $this->createdAt = $createdAt;

        return $this;
    }

    public function getUpdatedAt(): ?\DateTimeInterface
    {
        return $this->updatedAt;
    }

    public function setUpdatedAt(\DateTimeInterface $updatedAt): static
    {
        $this->updatedAt = $updatedAt;

        return $this;
    }

    public function getVerificationCode(): ?string
    {
        return $this->verificationCode;
    }

    public function setVerificationCode(?string $verificationCode): static
    {
        $this->verificationCode = $verificationCode;
        $this->updatedAt = new \DateTime();

        return $this;
    }

    public function isVerified(): ?bool
    {
        return $this->isVerified;
    }

    public function setIsVerified(bool $isVerified): static
    {
        $this->isVerified = $isVerified;
        $this->updatedAt = new \DateTime();

        if ($isVerified) {
            $this->verifiedAt = new \DateTime();
        }

        return $this;
    }

    public function getVerifiedAt(): ?\DateTimeInterface
    {
        return $this->verifiedAt;
    }

    public function setVerifiedAt(?\DateTimeInterface $verifiedAt): static
    {
        $this->verifiedAt = $verifiedAt;

        return $this;
    }

    public function getDeviceId(): ?string
    {
        return $this->deviceId;
    }

    public function setDeviceId(?string $deviceId): static
    {
        $this->deviceId = $deviceId;
        $this->updatedAt = new \DateTime();

        return $this;
    }

    public function getAvailableSpace(): ?AvailableSpace
    {
        return $this->availableSpace;
    }

    public function setAvailableSpace(?AvailableSpace $availableSpace): static
    {
        $this->availableSpace = $availableSpace;
        $this->updatedAt = new \DateTime();

        return $this;
    }

    /**
     * Generar ID único de reserva
     */
    public function generateReservationId(): static
    {
        $this->reservationId = 'RESERVA-' . time() . '-' . random_int(1000, 9999);
        
        return $this;
    }

    /**
     * Generar código de verificación
     */
    public function generateVerificationCode(): static
    {
        $this->verificationCode = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        
        return $this;
    }

    /**
     * Marcar como confirmada
     */
    public function confirm(): static
    {
        $this->status = self::STATUS_CONFIRMED;
        $this->updatedAt = new \DateTime();

        return $this;
    }

    /**
     * Marcar como cancelada
     */
    public function cancel(): static
    {
        $this->status = self::STATUS_CANCELLED;
        $this->updatedAt = new \DateTime();

        return $this;
    }

    /**
     * Marcar como completada
     */
    public function complete(): static
    {
        $this->status = self::STATUS_COMPLETED;
        $this->updatedAt = new \DateTime();

        return $this;
    }

    /**
     * Verificar si está confirmada
     */
    public function isConfirmed(): bool
    {
        return $this->status === self::STATUS_CONFIRMED;
    }

    /**
     * Verificar si está cancelada
     */
    public function isCancelled(): bool
    {
        return $this->status === self::STATUS_CANCELLED;
    }

    /**
     * Obtener fecha formateada
     */
    public function getDateFormatted(): string
    {
        return $this->date ? $this->date->format('Y-m-d') : '';
    }

    /**
     * Obtener precio como float
     */
    public function getPriceAsFloat(): float
    {
        return (float) $this->price;
    }

    /**
     * Serializar para JSON
     */
    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'reservationId' => $this->reservationId,
            'date' => $this->getDateFormatted(),
            'clientName' => $this->clientName,
            'phone' => $this->phone,
            'carBrand' => $this->carBrand,
            'carModel' => $this->carModel,
            'carSize' => $this->carSize,
            'services' => $this->services,
            'serviceNames' => $this->serviceNames,
            'price' => $this->getPriceAsFloat(),
            'notes' => $this->notes,
            'status' => $this->status,
            'isVerified' => $this->isVerified,
            'deviceId' => $this->deviceId,
            'createdAt' => $this->createdAt ? $this->createdAt->format('c') : null,
            'updatedAt' => $this->updatedAt ? $this->updatedAt->format('c') : null
        ];
    }
} 