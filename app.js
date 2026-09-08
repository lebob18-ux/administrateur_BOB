/* ============================================================
   CONFIGURATION SUPABASE
   ============================================================ */
const SUPABASE_URL = "https://thbqkeugjvsxbryfnzuo.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_2-Ij-nrTPeK6rB-kSD-QTg_b42zNakq";


const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const MOT_DE_PASSE_ADMIN = "Lebob18";

document.addEventListener("DOMContentLoaded", () => {
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
  
  chargerTableauGlobal();
}

/* ============================================================
   PILOTAGE GLOBAL DE LA TABLE app_bob
   ============================================================ */
async function chargerTableauGlobal() {
  const container = document.getElementById("utilisateurs-container");
  if (!container) return;
  container.innerHTML = `<p style="color:#666; font-size:0.9em;">Chargement des accès...</p>`;

  try {
    const { data, error } = await supabaseClient
      .from('app_bob')
      .select('*')
      .range(0, 9999);

    if (error) throw error;

    if (!data || data.length === 0) {
      container.innerHTML = `<p style="color:#999; font-size:0.9em;">Aucune donnée trouvée.</p>`;
      return;
    }

    const colonnes = Object.keys(data[0]);

    let html = `
      <div style="overflow-x: auto;">
        <table>
          <thead>
            <tr>
    `;

    colonnes.forEach(col => {
      html += `<th style="text-transform: uppercase; font-size: 0.75em; padding: 8px;">${col}</th>`;
    });
    
    html += `
            </tr>
          </thead>
          <tbody>
    `;

    data.forEach(row => {
      // Utilisation stricte de row.id comme identifiant
      const idLigne = row.id;

      html += `<tr>`;
      colonnes.forEach(col => {
        let valeur = row[col];

        // Si c'est un booléen et que ce n'est pas la colonne id
        if ((typeof valeur === 'boolean' || valeur === true || valeur === false) && col !== 'id') {
          const estCoche = valeur ? 'checked' : '';
          html += `<td style="padding: 6px; text-align: center;">
                    <input type="checkbox" ${estCoche} onchange="modifierCaseSupabase(${idLigne}, '${col}', this.checked)" style="transform: scale(1.1); cursor: pointer;">
                   </td>`;
        } else {
          if (valeur === null || valeur === undefined) valeur = '';
          html += `<td style="padding: 6px; font-size: 0.8em; white-space: nowrap;">${valeur}</td>`;
        }
      });
      html += `</tr>`;
    });

    html += `</tbody></table></div>`;
    container.innerHTML = html;
  } catch (err) {
    console.error("Erreur chargement :", err);
    container.innerHTML = `<p style="color:#dc2626; font-size:0.9em;">Erreur lors du chargement de la table 'app_bob'.</p>`;
  }
}

async function modifierCaseSupabase(idLigne, colonne, nouvelleValeur) {
  try {
    console.log(`Tentative de mise à jour -> ID: ${idLigne}, Colonne: ${colonne}, Valeur: ${nouvelleValeur}`);

    const updateData = {};
    updateData[colonne] = nouvelleValeur;

    const { data, error } = await supabaseClient
      .from('app_bob')
      .update(updateData)
      .eq('id', idLigne)
      .select(); // .select() permet de renvoyer la ligne modifiée pour vérifier si Supabase l'a bien prise en compte

    if (error) throw error;

    console.log("Mise à jour réussie dans Supabase. Résultat :", data);
  } catch (err) {
    console.error("Erreur détaillée Supabase :", err);
    alert("❌ Erreur lors de la mise à jour dans Supabase : " + (err.message || err));
    chargerTableauGlobal(); // Recharge pour remettre la case dans son état d'origine
  }
}
