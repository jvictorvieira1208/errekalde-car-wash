<?php

namespace App\Entity;

use App\Repository\ReservaRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: ReservaRepository::class)]
#[ORM\Table(name: 'reservas')]
#[ORM\Index(name: 'idx_fecha', columns: ['fecha'])]
#[ORM\Index(name: 'idx_phone', columns: ['phone'])]
#[ORM\Index(name: 'idx_status', columns: ['status'])]
#[ORM\Index(name: 'idx_reservation_id', columns: ['reservation_id'])]
#[ORM\HasLifecycleCallbacks]
class Reserva
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: Types::BIGINT)]
    private ?int $id = null;

    #[ORM\Column(length: 50, unique: true)]
    private ?string $reservationId = null;

    #[ORM\Column(type: Types::DATE_MUTABLE)]
    private ?\DateTimeInterface $fecha = null;

    #[ORM\Column(length: 100)]
    private ?string $name = null;

    #[ORM\Column(length: 20)]
    private ?string $phone = null;

    #[ORM\Column(length: 50)]
    private ?string $carBrand = null;

    #[ORM\Column(length: 50)]
    private ?string $carModel = null;

    #[ORM\Column(length: 10)]
    private ?string $carSize = null;

    #[ORM\Column(type: Types::DECIMAL, precision: 6, scale: 2)]
    private ?string $price = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $notas = null;

    #[ORM\Column(length: 10, options: ['default' => 'confirmed'])]
    private ?string $status = 'confirmed';

    #[ORM\Column(type: Types::DATETIME_MUTABLE, options: ['default' => 'CURRENT_TIMESTAMP'])]
    private ?\DateTimeInterface $createdAt = null;

    #[ORM\Column(type: Types::DATETIME_MUTABLE, options: ['default' => 'CURRENT_TIMESTAMP'])]
    private ?\DateTimeInterface $updatedAt = null;

    /**
     * @var Collection<int, ReservaServicio>
     */
    #[ORM\OneToMany(targetEntity: ReservaServicio::class, mappedBy: 'reserva', orphanRemoval: true, cascade: ['persist', 'remove'])]
    private Collection $reservaServicios;

    public function __construct()
    {
        $this->reservaServicios = new ArrayCollection();
        $this->createdAt = new \DateTime();
        $this->updatedAt = new \DateTime();
        $this->reservationId = $this->generateReservationId();
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

        return $this;
    }

    public function getFecha(): ?\DateTimeInterface
    {
        return $this->fecha;
    }

    public function setFecha(\DateTimeInterface $fecha): static
    {
        $this->fecha = $fecha;

        return $this;
    }

    public function getName(): ?string
    {
        return $this->name;
    }

    public function setName(string $name): static
    {
        $this->name = $name;

        return $this;
    }

    public function getPhone(): ?string
    {
        return $this->phone;
    }

    public function setPhone(string $phone): static
    {
        $this->phone = $phone;

        return $this;
    }

    public function getCarBrand(): ?string
    {
        return $this->carBrand;
    }

    public function setCarBrand(string $carBrand): static
    {
        $this->carBrand = $carBrand;

        return $this;
    }

    public function getCarModel(): ?string
    {
        return $this->carModel;
    }

    public function setCarModel(string $carModel): static
    {
        $this->carModel = $carModel;

        return $this;
    }

    public function getCarSize(): ?string
    {
        return $this->carSize;
    }

    public function setCarSize(string $carSize): static
    {
        $this->carSize = $carSize;

        return $this;
    }

    public function getPrice(): ?string
    {
        return $this->price;
    }

    public function setPrice(string $price): static
    {
        $this->price = $price;

        return $this;
    }

    public function getNotas(): ?string
    {
        return $this->notas;
    }

    public function setNotas(?string $notas): static
    {
        $this->notas = $notas;

        return $this;
    }

    public function getStatus(): ?string
    {
        return $this->status;
    }

    public function setStatus(string $status): static
    {
        $this->status = $status;

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

    /**
     * @return Collection<int, ReservaServicio>
     */
    public function getReservaServicios(): Collection
    {
        return $this->reservaServicios;
    }

    public function addReservaServicio(ReservaServicio $reservaServicio): static
    {
        if (!$this->reservaServicios->contains($reservaServicio)) {
            $this->reservaServicios->add($reservaServicio);
            $reservaServicio->setReserva($this);
        }

        return $this;
    }

    public function removeReservaServicio(ReservaServicio $reservaServicio): static
    {
        if ($this->reservaServicios->removeElement($reservaServicio)) {
            // set the owning side to null (unless already changed)
            if ($reservaServicio->getReserva() === $this) {
                $reservaServicio->setReserva(null);
            }
        }

        return $this;
    }

    #[ORM\PreUpdate]
    public function setUpdatedAtValue(): void
    {
        $this->updatedAt = new \DateTime();
    }

    /**
     * Genera un ID único para la reserva
     */
    private function generateReservationId(): string
    {
        return (string) (time() * 1000 + random_int(100, 999));
    }

    /**
     * Verifica si la reserva está confirmada
     */
    public function isConfirmed(): bool
    {
        return $this->status === 'confirmed';
    }

    /**
     * Cancela la reserva
     */
    public function cancel(): static
    {
        $this->status = 'cancelled';
        return $this;
    }

    /**
     * Completa la reserva
     */
    public function complete(): static
    {
        $this->status = 'completed';
        return $this;
    }

    /**
     * Obtiene los servicios como array de strings
     */
    public function getServicesArray(): array
    {
        return $this->reservaServicios->map(fn(ReservaServicio $rs) => $rs->getServicio()->getServiceCode())->toArray();
    }

    /**
     * Obtiene los nombres de servicios como array
     */
    public function getServiceNamesArray(): array
    {
        return $this->reservaServicios->map(fn(ReservaServicio $rs) => $rs->getServicio()->getServiceName())->toArray();
    }

    /**
     * Retorna la fecha en formato string
     */
    public function getFechaString(): string
    {
        return $this->fecha ? $this->fecha->format('Y-m-d') : '';
    }
} 