/* ============================================================
   CONFIGURATION SUPABASE
   ============================================================ */
// Remplace par tes propres clés Supabase
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
  if (!container) return;
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
            <input type="checkbox" ${user.fbm ? 'checked' : ''} onchange="modifierDroitUtilisateur('${user.email}', 'fbm', this.checked)" style="transform: scale(1.2); cursor: pointer;">
          </td>
          <td style="text-align: center;">
            <input type="checkbox" ${user.admin ? 'checked' : ''} onchange="modifierDroitUtilisateur('${user.email}', 'admin', this.checked)" style="transform: scale(1.2); cursor: pointer;">
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

async function modifierDroitUtilisateur(email, colonne, valeur) {
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
  if (!container) return;
  container.innerHTML = `<p style="color:#666; font-size:0.9em;">Chargement des chantiers...</p>`;

  try {
    // .range(0, 9999) permet de lever la limite par défaut des 1000 lignes de Supabase
    const { data, error } = await supabaseClient
      .from('chantiers')
      .select('*')
      .range(0, 9999);

    if (error) throw error;

    if (!data || data.length === 0) {
      container.innerHTML = `<p style="color:#999; font-size:0.9em;">Aucun chantier enregistré.</p>`;
      return;
    }

    // Récupère dynamiquement toutes les colonnes présentes dans la table
    const colonnes = Object.keys(data[0]);

    let html = `
      <div style="overflow-x: auto;">
        <table>
          <thead>
            <tr>
    `;

    colonnes.forEach(col => {
      html += `<th style="text-transform: uppercase; font-size: 0.75em;">${col}</th>`;
    });
    html += `<th style="text-align: center; font-size: 0.75em;">Action</th>`;
    
    html += `
            </tr>
          </thead>
          <tbody>
    `;

    data.forEach(row => {
      html += `<tr>`;
      colonnes.forEach(col => {
        let valeur = row[col];
        
        // Si la colonne est un booléen, on affiche une case à cocher interactive liée à Supabase
        if (typeof valeur === 'boolean' || valeur === true || valeur === false) {
          const estCoche = valeur ? 'checked' : '';
          html += `<td style="padding: 6px; text-align: center;">
                    <input type="checkbox" ${estCoche} onchange="modifierValeurChantier(${row.id}, '${col}', this.checked)" style="transform: scale(1.1); cursor: pointer;">
                   </td>`;
        } else {
          if (valeur === null || valeur === undefined) valeur = '';
          html += `<td style="padding: 6px; font-size: 0.8em;">${valeur}</td>`;
        }
      });

      // Bouton de suppression de la ligne (nécessite une colonne 'id')
      html += `
          <td style="text-align: center;">
            <button onclick="supprimerSupport(${row.id})" style="background:#fee2e2; color:#dc2626; border:none; padding:4px 8px; border-radius:4px; cursor:pointer;">🗑️</button>
          </td>
        </tr>
      `;
    });

    html += `</tbody></table></div>`;
    container.innerHTML = html;
  } catch (err) {
    console.error("Erreur chargement chantiers :", err);
    container.innerHTML = `<p style="color:#666; font-size:0.85em;">Erreur lors du chargement de la table 'chantiers'. Vérifie les colonnes et l'existence de 'id'.</p>`;
  }
}

async function modifierValeurChantier(idLigne, colonne, nouvelleValeur) {
  try {
    const updateData = {};
    updateData[colonne] = nouvelleValeur;

    const { error } = await supabaseClient
      .from('chantiers')
      .update(updateData)
      .eq('id', idLigne);

    if (error) throw error;
    console.log(`Ligne ${idLigne} mise à jour : ${colonne} = ${nouvelleValeur}`);
  } catch (err) {
    console.error("Erreur mise à jour :", err);
    alert("❌ Erreur lors de la mise à jour dans Supabase.");
    chargerTableauChantiers();
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
