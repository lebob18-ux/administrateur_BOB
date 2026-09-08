/* ============================================================
   CONFIGURATION SUPABASE
   ============================================================ */
// Remplace par tes propres clés Supabase (les mêmes que tes autres apps)
const SUPABASE_URL = "https://thbqkeugjvsxbryfnzuo.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_2-Ij-nrTPeK6rB-kSD-QTg_b42zNakq";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Mot de passe unique requis
const MOT_DE_PASSE_ADMIN = "Lebob18";

document.addEventListener("DOMContentLoaded", () => {
  // Vérifie si déjà connecté dans la session en cours
  if (sessionStorage.getItem("admin_connecte") === "true") {
    afficherApplication();
  }
});

function verifierMotDePasse() {
  const saisie = document.getElementById("admin-password-input").value;
  const errorEl = document.getElementById("auth-error");

  if (saisie === MOT_DE_PASSE_ADMIN) {
    sessionStorage.setItem("admin_connecte", "true");
    afficherApplication();
  } else {
    errorEl.textContent = "❌ Mot de passe incorrect.";
    errorEl.style.display = "block";
  }
}

function deconnexionAdmin() {
  sessionStorage.removeItem("admin_connecte");
  location.reload();
}

function afficherApplication() {
  document.getElementById("auth-overlay").style.display = "none";
  document.getElementById("main-app").style.display = "block";
  
  // Charger les données de Supabase
  chargerTableauUtilisateurs();
  chargerTableauChantiers();
}

/* ============================================================
   1. GESTION DES UTILISATEURS (Table app_bob)
   ============================================================ */
async function chargerTableauUtilisateurs() {
  const container = document.getElementById("utilisateurs-container");
  container.innerHTML = `<p style="color:#666; font-size:0.9em;">Chargement des utilisateurs...</p>`;

  try {
    const { data, error } = await supabaseClient
      .from('app_bob')
      .select('*')
      .order('nom', { ascending: true });

    if (error) throw error;

    if (!data || data.length === 0) {
      container.innerHTML = `<p style="color:#999; font-size:0.9em;">Aucun utilisateur trouvé.</p>`;
      return;
    }

    let html = `
      <table>
        <thead>
          <tr>
            <th>Utilisateur</th>
            <th style="text-align: center;">FBM</th>
            <th style="text-align: center;">Admin</th>
          </tr>
        </thead>
        <tbody>
    `;

    data.forEach(user => {
      const nomComplet = `${user.prenom || ''} ${user.nom || ''}`.trim() || 'Sans nom';
      html += `
        <tr>
          <td>
            <strong>${nomComplet}</strong><br>
            <span style="color:#666; font-size:0.75em;">${user.email || ''}</span>
          </td>
          <td style="text-align: center;">
            <input type="checkbox" ${user.fbm ? 'checked' : ''} onchange="modifierDroit('${user.email}', 'fbm', this.checked)" style="transform: scale(1.2); cursor: pointer;">
          </td>
          <td style="text-align: center;">
            <input type="checkbox" ${user.admin ? 'checked' : ''} onchange="modifierDroit('${user.email}', 'admin', this.checked)" style="transform: scale(1.2); cursor: pointer;">
          </td>
        </tr>
      `;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
  } catch (err) {
    console.error("Erreur chargement utilisateurs :", err);
    container.innerHTML = `<p style="color:#dc2626; font-size:0.9em;">Erreur de chargement des utilisateurs.</p>`;
  }
}

async function modifierDroit(email, colonne, valeur) {
  try {
    const updateData = {};
    updateData[colonne] = valeur;

    const { error } = await supabaseClient
      .from('app_bob')
      .update(updateData)
      .eq('email', email);

    if (error) throw error;
  } catch (err) {
    alert("❌ Erreur lors de la modification du droit.");
    chargerTableauUtilisateurs();
  }
}

/* ============================================================
   2. GESTION DES CHANTIERS / SUPPORTS (Table chantiers)
   ============================================================ */
async function chargerTableauChantiers() {
  const container = document.getElementById("chantiers-container");
  container.innerHTML = `<p style="color:#666; font-size:0.9em;">Chargement des chantiers...</p>`;

  try {
    const { data, error } = await supabaseClient
      .from('chantiers')
      .select('*')
      .order('chantier', { ascending: true });

    if (error) throw error;

    if (!data || data.length === 0) {
      container.innerHTML = `<p style="color:#999; font-size:0.9em;">Aucun chantier enregistré.</p>`;
      return;
    }

    let html = `
      <table>
        <thead>
          <tr>
            <th>Chantier</th>
            <th>Support</th>
            <th style="text-align: center;">Action</th>
          </tr>
        </thead>
        <tbody>
    `;

    data.forEach(row => {
      html += `
        <tr>
          <td>${row.chantier}</td>
          <td>${row.support}</td>
          <td style="text-align: center;">
            <button onclick="supprimerSupport(${row.id})" style="background:#fee2e2; color:#dc2626; border:none; padding:4px 8px; border-radius:4px; cursor:pointer;">🗑️</button>
          </td>
        </tr>
      `;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
  } catch (err) {
    container.innerHTML = `<p style="color:#666; font-size:0.85em;">Assure-toi que la table 'chantiers' existe dans Supabase.</p>`;
  }
}

async function ajouterChantier() {
  const chantier = document.getElementById("new-chantier").value.trim();
  const support = document.getElementById("new-support").value.trim();

  if (!chantier || !support) {
    alert("⚠️ Renseigne le nom du chantier et du support.");
    return;
  }

  try {
    const { error } = await supabaseClient
      .from('chantiers')
      .insert([{ chantier: chantier, support: support }]);

    if (error) throw error;

    document.getElementById("new-support").value = "";
    chargerTableauChantiers();
  } catch (err) {
    alert("❌ Erreur lors de l'ajout : " + err.message);
  }
}

async function supprimerSupport(id) {
  if (!confirm("Supprimer ce support ?")) return;
  try {
    const { error } = await supabaseClient
      .from('chantiers')
      .delete()
      .eq('id', id);

    if (error) throw error;
    chargerTableauChantiers();
  } catch (err) {
    alert("❌ Erreur lors de la suppression.");
  }
}
