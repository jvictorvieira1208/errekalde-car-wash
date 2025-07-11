<?php

namespace App\Entity;

use App\Repository\ReservaServicioRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: ReservaServicioRepository::class)]
#[ORM\Table(name: 'reserva_servicios')]
#[ORM\UniqueConstraint(name: 'unique_reserva_servicio', columns: ['reserva_id', 'servicio_id'])]
class ReservaServicio
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Reserva::class, inversedBy: 'reservaServicios')]
    #[ORM\JoinColumn(nullable: false)]
    private ?Reserva $reserva = null;

    #[ORM\ManyToOne(targetEntity: Servicio::class, inversedBy: 'reservaServicios')]
    #[ORM\JoinColumn(nullable: false)]
    private ?Servicio $servicio = null;

    #[ORM\Column(type: Types::DECIMAL, precision: 6, scale: 2)]
    private ?string $priceApplied = null;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getReserva(): ?Reserva
    {
        return $this->reserva;
    }

    public function setReserva(?Reserva $reserva): static
    {
        $this->reserva = $reserva;

        return $this;
    }

    public function getServicio(): ?Servicio
    {
        return $this->servicio;
    }

    public function setServicio(?Servicio $servicio): static
    {
        $this->servicio = $servicio;

        return $this;
    }

    public function getPriceApplied(): ?string
    {
        return $this->priceApplied;
    }

    public function setPriceApplied(string $priceApplied): static
    {
        $this->priceApplied = $priceApplied;

        return $this;
    }

    /**
     * Obtiene el precio aplicado como float
     */
    public function getPriceAppliedFloat(): float
    {
        return (float) $this->priceApplied;
    }
} 