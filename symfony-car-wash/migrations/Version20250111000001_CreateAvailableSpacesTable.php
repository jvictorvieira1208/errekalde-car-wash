<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20250111000001 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create available_spaces table for car wash reservations';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE available_spaces (
            id INT AUTO_INCREMENT NOT NULL, 
            date DATE NOT NULL, 
            available_spaces INT NOT NULL, 
            total_spaces INT NOT NULL, 
            created_at DATETIME NOT NULL, 
            updated_at DATETIME NOT NULL, 
            is_active TINYINT(1) NOT NULL DEFAULT 1, 
            PRIMARY KEY(id),
            UNIQUE INDEX uniq_date (date),
            INDEX idx_date (date)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('DROP TABLE available_spaces');
    }
} 