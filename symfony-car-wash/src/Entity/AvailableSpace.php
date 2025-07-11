<?php

namespace App\Entity;

use App\Repository\AvailableSpaceRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: AvailableSpaceRepository::class)]
#[ORM\Table(name: 'available_spaces')]
#[ORM\Index(columns: ['date'], name: 'idx_date')]
#[ORM\UniqueConstraint(name: 'uniq_date', columns: ['date'])]
class AvailableSpace
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(type: Types::DATE_MUTABLE, unique: true)]
    #[Assert\NotNull]
    #[Assert\Type(\DateTimeInterface::class)]
    private ?\DateTimeInterface $date = null;

    #[ORM\Column]
    #[Assert\NotNull]
    #[Assert\Range(min: 0, max: 50)]
    private ?int $availableSpaces = null;

    #[ORM\Column]
    #[Assert\NotNull]
    #[Assert\Range(min: 0, max: 50)]
    private ?int $totalSpaces = null;

    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    private ?\DateTimeInterface $createdAt = null;

    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    private ?\DateTimeInterface $updatedAt = null;

    #[ORM\Column]
    private ?bool $isActive = true;

    public function __construct()
    {
        $this->createdAt = new \DateTime();
        $this->updatedAt = new \DateTime();
        $this->isActive = true;
    }

    public function getId(): ?int
    {
        return $this->id;
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

    public function getAvailableSpaces(): ?int
    {
        return $this->availableSpaces;
    }

    public function setAvailableSpaces(int $availableSpaces): static
    {
        $this->availableSpaces = max(0, $availableSpaces);
        $this->updatedAt = new \DateTime();

        return $this;
    }

    public function getTotalSpaces(): ?int
    {
        return $this->totalSpaces;
    }

    public function setTotalSpaces(int $totalSpaces): static
    {
        $this->totalSpaces = $totalSpaces;
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

    public function isActive(): ?bool
    {
        return $this->isActive;
    }

    public function setIsActive(bool $isActive): static
    {
        $this->isActive = $isActive;
        $this->updatedAt = new \DateTime();

        return $this;
    }

    /**
     * Decrementar espacios disponibles (para reservas)
     */
    public function decrementSpaces(): static
    {
        if ($this->availableSpaces > 0) {
            $this->availableSpaces--;
            $this->updatedAt = new \DateTime();
        }

        return $this;
    }

    /**
     * Incrementar espacios disponibles (para cancelaciones)
     */
    public function incrementSpaces(): static
    {
        if ($this->availableSpaces < $this->totalSpaces) {
            $this->availableSpaces++;
            $this->updatedAt = new \DateTime();
        }

        return $this;
    }

    /**
     * Verificar si hay espacios disponibles
     */
    public function hasAvailableSpaces(): bool
    {
        return $this->availableSpaces > 0;
    }

    /**
     * Verificar si es miércoles
     */
    public function isWednesday(): bool
    {
        return $this->date && $this->date->format('N') === '3';
    }

    /**
     * Obtener fecha formateada para JSON
     */
    public function getDateFormatted(): string
    {
        return $this->date ? $this->date->format('Y-m-d') : '';
    }

    /**
     * Serializar para JSON
     */
    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'date' => $this->getDateFormatted(),
            'availableSpaces' => $this->availableSpaces,
            'totalSpaces' => $this->totalSpaces,
            'isActive' => $this->isActive,
            'hasSpaces' => $this->hasAvailableSpaces(),
            'isWednesday' => $this->isWednesday(),
            'updatedAt' => $this->updatedAt ? $this->updatedAt->format('c') : null
        ];
    }
} 