<?php

namespace App\Entity;

use App\Repository\ServicioRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: ServicioRepository::class)]
#[ORM\Table(name: 'servicios')]
class Servicio
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 50, unique: true)]
    private ?string $serviceCode = null;

    #[ORM\Column(length: 100)]
    private ?string $serviceName = null;

    #[ORM\Column(type: Types::DECIMAL, precision: 6, scale: 2, options: ['default' => '0.00'])]
    private ?string $basePrice = '0.00';

    #[ORM\Column(options: ['default' => true])]
    private ?bool $isActive = true;

    #[ORM\Column(type: Types::DATETIME_MUTABLE, options: ['default' => 'CURRENT_TIMESTAMP'])]
    private ?\DateTimeInterface $createdAt = null;

    /**
     * @var Collection<int, ReservaServicio>
     */
    #[ORM\OneToMany(targetEntity: ReservaServicio::class, mappedBy: 'servicio', orphanRemoval: true)]
    private Collection $reservaServicios;

    public function __construct()
    {
        $this->reservaServicios = new ArrayCollection();
        $this->createdAt = new \DateTime();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getServiceCode(): ?string
    {
        return $this->serviceCode;
    }

    public function setServiceCode(string $serviceCode): static
    {
        $this->serviceCode = $serviceCode;

        return $this;
    }

    public function getServiceName(): ?string
    {
        return $this->serviceName;
    }

    public function setServiceName(string $serviceName): static
    {
        $this->serviceName = $serviceName;

        return $this;
    }

    public function getBasePrice(): ?string
    {
        return $this->basePrice;
    }

    public function setBasePrice(string $basePrice): static
    {
        $this->basePrice = $basePrice;

        return $this;
    }

    public function isActive(): ?bool
    {
        return $this->isActive;
    }

    public function setActive(bool $isActive): static
    {
        $this->isActive = $isActive;

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
            $reservaServicio->setServicio($this);
        }

        return $this;
    }

    public function removeReservaServicio(ReservaServicio $reservaServicio): static
    {
        if ($this->reservaServicios->removeElement($reservaServicio)) {
            // set the owning side to null (unless already changed)
            if ($reservaServicio->getServicio() === $this) {
                $reservaServicio->setServicio(null);
            }
        }

        return $this;
    }

    /**
     * Representación string del servicio
     */
    public function __toString(): string
    {
        return $this->serviceName ?? '';
    }

    /**
     * Obtiene el precio base como float
     */
    public function getBasePriceFloat(): float
    {
        return (float) $this->basePrice;
    }
} 