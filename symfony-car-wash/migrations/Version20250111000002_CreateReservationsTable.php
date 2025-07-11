<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20250111000002 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create reservations table for car wash bookings';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE reservations (
            id INT AUTO_INCREMENT NOT NULL, 
            available_space_id INT DEFAULT NULL,
            reservation_id VARCHAR(255) NOT NULL, 
            date DATE NOT NULL, 
            client_name VARCHAR(255) NOT NULL, 
            phone VARCHAR(20) NOT NULL, 
            car_brand VARCHAR(100) NOT NULL, 
            car_model VARCHAR(100) NOT NULL, 
            car_size VARCHAR(20) NOT NULL, 
            services JSON NOT NULL, 
            service_names JSON NOT NULL, 
            price NUMERIC(8, 2) NOT NULL, 
            notes LONGTEXT DEFAULT NULL, 
            status VARCHAR(20) NOT NULL DEFAULT "pending", 
            created_at DATETIME NOT NULL, 
            updated_at DATETIME NOT NULL, 
            verification_code VARCHAR(6) DEFAULT NULL, 
            is_verified TINYINT(1) NOT NULL DEFAULT 0, 
            verified_at DATETIME DEFAULT NULL, 
            device_id VARCHAR(50) DEFAULT NULL, 
            PRIMARY KEY(id),
            UNIQUE INDEX uniq_reservation_id (reservation_id),
            INDEX idx_reservation_date (date),
            INDEX idx_phone (phone),
            INDEX idx_status (status),
            INDEX idx_created_at (created_at),
            INDEX fk_reservation_available_space (available_space_id),
            CONSTRAINT FK_4DA239 FOREIGN KEY (available_space_id) REFERENCES available_spaces (id) ON DELETE SET NULL
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE reservations DROP FOREIGN KEY FK_4DA239');
        $this->addSql('DROP TABLE reservations');
    }
} 