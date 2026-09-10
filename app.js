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
      const idLigne = row.id;

      html += `<tr>`;
      colonnes.forEach(col => {
        let valeur = row[col];

        // 1. Si c'est l'ID : lecture seule
        if (col === 'id') {
          html += `<td style="padding: 6px; font-size: 0.8em; white-space: nowrap; color: #888;">${valeur}</td>`;
        }
        // 2. Si c'est un booléen (cases à cocher des chantiers/droits)
        else if (typeof valeur === 'boolean' || valeur === true || valeur === false) {
          const estCoche = valeur ? 'checked' : '';
          html += `<td style="padding: 6px; text-align: center;">
                    <input type="checkbox" ${estCoche} onchange="modifierCaseSupabase(${idLigne}, '${col}', this.checked)" style="transform: scale(1.1); cursor: pointer;">
                   </td>`;
        } 
        // 3. Si c'est la colonne 'entreprise' : champ texte modifiable avec forçage en majuscules
        else if (col === 'entreprise') {
          if (valeur === null || valeur === undefined) valeur = '';
          html += `<td style="padding: 6px;">
                    <input type="text" value="${valeur}" oninput="this.value = this.value.toUpperCase()" onchange="modifierChampTexteSupabase(${idLigne}, '${col}', this.value)" style="padding: 4px; font-size: 0.8em; border: 1px solid #ccc; border-radius: 4px; width: 130px; text-transform: uppercase;">
                   </td>`;
        } 
        // 4. Autres colonnes en lecture simple
        else {
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
    const updateData = {};
    updateData[colonne] = nouvelleValeur;

    const { error } = await supabaseClient
      .from('app_bob')
      .update(updateData)
      .eq('id', String(idLigne)); 

    if (error) throw error;
    console.log("Mise à jour case validée !");
  } catch (err) {
    console.error("Erreur détaillée Supabase :", err);
    alert("❌ Erreur lors de la mise à jour : " + (err.message || err));
    chargerTableauGlobal();
  }
}

async function modifierChampTexteSupabase(idLigne, colonne, nouvelleValeur) {
  try {
    const updateData = {};
    updateData[colonne] = nouvelleValeur.trim().toUpperCase();

    const { error } = await supabaseClient
      .from('app_bob')
      .update(updateData)
      .eq('id', String(idLigne));

    if (error) throw error;
    console.log(`Mise à jour [${colonne}] validée pour l'ID ${idLigne} !`);
  } catch (err) {
    console.error("Erreur détaillée Supabase :", err);
    alert("❌ Erreur lors de la mise à jour du texte : " + (err.message || err));
    chargerTableauGlobal();
  }
}

async function ajouterUtilisateur() {
  const email = document.getElementById("new-email").value.trim();
  const nom = document.getElementById("new-nom").value.trim();
  const prenom = document.getElementById("new-prenom").value.trim();
  // Récupération de l'entreprise depuis ton HTML et forçage en majuscules
  const inputEntrep = document.getElementById("new-entreprise");
  const entreprise = inputEntrep ? inputEntrep.value.trim().toUpperCase() : "";

  if (!email) {
    alert("⚠️ L'adresse email est obligatoire.");
    return;
  }

  try {
    const { error } = await supabaseClient
      .from('app_bob')
      .insert([{ email: email, nom: nom, prenom: prenom, entreprise: entreprise }]);

    if (error) throw error;

    document.getElementById("new-email").value = "";
    document.getElementById("new-nom").value = "";
    document.getElementById("new-prenom").value = "";
    if (inputEntrep) {
      inputEntrep.value = "";
    }

    chargerTableauGlobal();
    console.log("Nouvel utilisateur ajouté avec succès !");
  } catch (err) {
    console.error("Erreur lors de l'ajout :", err);
    alert("❌ Erreur lors de l'ajout de l'utilisateur : " + err.message);
  }
}
