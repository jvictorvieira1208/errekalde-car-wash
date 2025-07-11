<?php

namespace App\Entity;

use App\Repository\EspaciosDisponiblesRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: EspaciosDisponiblesRepository::class)]
#[ORM\Table(name: 'espacios_disponibles')]
#[ORM\Index(name: 'idx_fecha', columns: ['fecha'])]
#[ORM\HasLifecycleCallbacks]
class EspaciosDisponibles
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(type: Types::DATE_MUTABLE, unique: true)]
    private ?\DateTimeInterface $fecha = null;

    #[ORM\Column(type: Types::SMALLINT, options: ['default' => 8])]
    private ?int $espaciosTotales = 8;

    #[ORM\Column(type: Types::SMALLINT, options: ['default' => 8])]
    private ?int $espaciosDisponibles = 8;

    #[ORM\Column(type: Types::DATETIME_MUTABLE, options: ['default' => 'CURRENT_TIMESTAMP'])]
    private ?\DateTimeInterface $createdAt = null;

    #[ORM\Column(type: Types::DATETIME_MUTABLE, options: ['default' => 'CURRENT_TIMESTAMP'])]
    private ?\DateTimeInterface $updatedAt = null;

    /**
     * @var Collection<int, Reserva>
     */
    #[ORM\OneToMany(targetEntity: Reserva::class, mappedBy: 'fecha', orphanRemoval: true)]
    private Collection $reservas;

    public function __construct()
    {
        $this->reservas = new ArrayCollection();
        $this->createdAt = new \DateTime();
        $this->updatedAt = new \DateTime();
    }

    public function getId(): ?int
    {
        return $this->id;
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

    public function getEspaciosTotales(): ?int
    {
        return $this->espaciosTotales;
    }

    public function setEspaciosTotales(int $espaciosTotales): static
    {
        $this->espaciosTotales = $espaciosTotales;

        return $this;
    }

    public function getEspaciosDisponibles(): ?int
    {
        return $this->espaciosDisponibles;
    }

    public function setEspaciosDisponibles(int $espaciosDisponibles): static
    {
        $this->espaciosDisponibles = $espaciosDisponibles;

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
     * @return Collection<int, Reserva>
     */
    public function getReservas(): Collection
    {
        return $this->reservas;
    }

    public function addReserva(Reserva $reserva): static
    {
        if (!$this->reservas->contains($reserva)) {
            $this->reservas->add($reserva);
            $reserva->setFecha($this->fecha);
        }

        return $this;
    }

    public function removeReserva(Reserva $reserva): static
    {
        $this->reservas->removeElement($reserva);

        return $this;
    }

    #[ORM\PreUpdate]
    public function setUpdatedAtValue(): void
    {
        $this->updatedAt = new \DateTime();
    }

    /**
     * Reduce los espacios disponibles en 1
     */
    public function reducirEspacio(): static
    {
        if ($this->espaciosDisponibles > 0) {
            $this->espaciosDisponibles--;
        }

        return $this;
    }

    /**
     * Aumenta los espacios disponibles en 1
     */
    public function aumentarEspacio(): static
    {
        if ($this->espaciosDisponibles < $this->espaciosTotales) {
            $this->espaciosDisponibles++;
        }

        return $this;
    }

    /**
     * Verifica si hay espacios disponibles
     */
    public function tieneEspaciosDisponibles(): bool
    {
        return $this->espaciosDisponibles > 0;
    }

    /**
     * Retorna la fecha en formato string
     */
    public function getFechaString(): string
    {
        return $this->fecha ? $this->fecha->format('Y-m-d') : '';
    }
} 