-- ============================================
-- USERS & AUTHENTIFICATION
-- ============================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    email VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user',
    group_id INTEGER,
    notification_prefs JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- GROUPES DE PERMISSIONS
-- ============================================

CREATE TABLE IF NOT EXISTS user_groups (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT DEFAULT '',
    permissions JSONB DEFAULT '{}'
);

-- Lier users aux groupes
ALTER TABLE users 
    ADD CONSTRAINT fk_users_group 
    FOREIGN KEY (group_id) REFERENCES user_groups(id) ON DELETE SET NULL;

-- ============================================
-- RESET MOT DE PASSE
-- ============================================

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- DÉPARTEMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS "Departement" (
    "RefDepartement" SERIAL PRIMARY KEY,
    "NomDepartement" VARCHAR(100) UNIQUE NOT NULL,
    "Description" TEXT DEFAULT '',
    "Couleur" VARCHAR(20) DEFAULT '#6366f1',
    "Created" TIMESTAMP DEFAULT NOW(),
    "Modified" TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- FOURNISSEURS PAR PIÈCE (relation many-to-many)
-- ============================================

CREATE TABLE IF NOT EXISTS "PieceFournisseur" (
    "id" SERIAL PRIMARY KEY,
    "RéfPièce" INTEGER NOT NULL REFERENCES "Pièce"("RéfPièce") ON DELETE CASCADE,
    "RéfFournisseur" INTEGER NOT NULL REFERENCES "Fournisseurs"("RéfFournisseur") ON DELETE CASCADE,
    "EstPrincipal" BOOLEAN DEFAULT FALSE,
    "NumPièceFournisseur" VARCHAR(100) DEFAULT '',
    "PrixUnitaire" NUMERIC(10,2) DEFAULT 0,
    "DelaiLivraison" VARCHAR(100) DEFAULT '',
    "DateAjout" TIMESTAMP DEFAULT NOW(),
    UNIQUE("RéfPièce", "RéfFournisseur")
);

-- ============================================
-- SOUMISSIONS
-- ============================================

CREATE TABLE IF NOT EXISTS "Soumissions" (
    "RefSoumission" SERIAL PRIMARY KEY,
    "RéfFournisseur" INTEGER REFERENCES "Fournisseurs"("RéfFournisseur") ON DELETE SET NULL,
    "EmailsDestinataires" TEXT DEFAULT '',
    "Sujet" TEXT DEFAULT '',
    "MessageCorps" TEXT DEFAULT '',
    "Pieces" JSONB DEFAULT '[]',
    "User" VARCHAR(100) DEFAULT 'Système',
    "Notes" TEXT DEFAULT '',
    "Statut" VARCHAR(50) DEFAULT 'Envoyée',
    "DateEnvoi" TIMESTAMP DEFAULT NOW(),
    "DateReponse" TIMESTAMP,
    "DateRappel" TIMESTAMP,
    "NoteStatut" TEXT DEFAULT '',
    "PieceJointe" VARCHAR(255),
    "Created" TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- PRIX DES SOUMISSIONS
-- ============================================

CREATE TABLE IF NOT EXISTS "SoumissionPrix" (
    "id" SERIAL PRIMARY KEY,
    "RefSoumission" INTEGER NOT NULL REFERENCES "Soumissions"("RefSoumission") ON DELETE CASCADE,
    "RéfPièce" INTEGER NOT NULL,
    "PrixUnitaire" NUMERIC(10,2) NOT NULL,
    "DelaiLivraison" VARCHAR(100) DEFAULT '',
    "Commentaire" TEXT DEFAULT '',
    "DateSaisie" TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- GROUPES DE PIÈCES
-- ============================================

CREATE TABLE IF NOT EXISTS "Categorie" (
    "RefCategorie" SERIAL PRIMARY KEY,
    "NomCategorie" VARCHAR(100) NOT NULL,
    "Description" TEXT DEFAULT '',
    "Created" TIMESTAMP DEFAULT NOW(),
    "Modified" TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Groupe" (
    "RefGroupe" SERIAL PRIMARY KEY,
    "RefCategorie" INTEGER NOT NULL REFERENCES "Categorie"("RefCategorie") ON DELETE CASCADE,
    "NomGroupe" VARCHAR(100) NOT NULL,
    "Description" TEXT DEFAULT '',
    "Created" TIMESTAMP DEFAULT NOW(),
    "Modified" TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "GroupePiece" (
    "id" SERIAL PRIMARY KEY,
    "RefGroupe" INTEGER NOT NULL REFERENCES "Groupe"("RefGroupe") ON DELETE CASCADE,
    "RéfPièce" INTEGER NOT NULL REFERENCES "Pièce"("RéfPièce") ON DELETE CASCADE,
    "Quantite" INTEGER DEFAULT 1,
    "Ordre" INTEGER,
    UNIQUE("RefGroupe", "RéfPièce")
);

-- ============================================
-- COLONNES AJOUTÉES À LA TABLE PIÈCE
-- ============================================

ALTER TABLE "Pièce"
    ADD COLUMN IF NOT EXISTS "approbation_statut" VARCHAR(50),
    ADD COLUMN IF NOT EXISTS "approbation_par" VARCHAR(100),
    ADD COLUMN IF NOT EXISTS "approbation_date" TIMESTAMP,
    ADD COLUMN IF NOT EXISTS "approbation_note" TEXT,
    ADD COLUMN IF NOT EXISTS "demandeur" VARCHAR(100),
    ADD COLUMN IF NOT EXISTS "RefDepartement" INTEGER REFERENCES "Departement"("RefDepartement") ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS "devise" VARCHAR(10) DEFAULT 'CAD',
    ADD COLUMN IF NOT EXISTS "NoFESTO" VARCHAR(100) DEFAULT '',
    ADD COLUMN IF NOT EXISTS "NumPièceAutreFournisseur" VARCHAR(100) DEFAULT '',
    ADD COLUMN IF NOT EXISTS "SoumDem" BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS "ImagePath" VARCHAR(255),
    ADD COLUMN IF NOT EXISTS "Cmd_info" TEXT DEFAULT '';

-- ============================================
-- GROUPES PAR DÉFAUT
-- ============================================

INSERT INTO user_groups (name, description, permissions) VALUES
('admin', 'Administrateur complet', '{"inventaire_view":true,"inventaire_create":true,"inventaire_update":true,"inventaire_delete":true,"inventaire_sortie_rapide":true,"groupes_view":true,"groupes_create":true,"groupes_update":true,"groupes_delete":true,"fournisseur_view":true,"fournisseur_create":true,"fournisseur_update":true,"fournisseur_delete":true,"fabricant_view":true,"fabricant_create":true,"fabricant_update":true,"fabricant_delete":true,"commandes_view":true,"commandes_create":true,"commandes_update":true,"soumissions_view":true,"soumissions_create":true,"soumissions_update":true,"receptions_view":true,"receptions_create":true,"receptions_update":true,"historique_view":true,"can_delete_any":true,"can_manage_users":true,"can_approve_orders":true,"can_submit_approval":true}'),
('acheteur', 'Acheteur', '{"inventaire_view":true,"inventaire_create":true,"inventaire_update":true,"inventaire_sortie_rapide":true,"groupes_view":true,"fournisseur_view":true,"fabricant_view":true,"commandes_view":true,"commandes_create":true,"soumissions_view":true,"soumissions_create":true,"receptions_view":true,"historique_view":true,"can_submit_approval":true}'),
('user', 'Utilisateur standard', '{"inventaire_view":true,"inventaire_sortie_rapide":true,"groupes_view":true,"fournisseur_view":true,"fabricant_view":true,"historique_view":true}')
ON CONFLICT (name) DO NOTHING;