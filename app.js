/* ============================================================
   CONFIGURATION SUPABASE
   ============================================================ */
const SUPABASE_URL = "https://thbqkeugjvsxbryfnzuo.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_2-Ij-nrTPeK6rB-kSD-QTg_b42zNakq";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const MOT_DE_PASSE_ADMIN = "Lebob18";

// Variable pour suivre la table active et stocker les données brutes
let tableActive = "app_bob";
let donneesBrutes = [];

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
   GESTION DU CHANGEMENT DE TABLE
   ============================================================ */
function changerTableActive(nomTable) {
  tableActive = nomTable;
  
  const sectionAjout = document.getElementById("section-ajout");
  const titreTableau = document.getElementById("titre-tableau");
  const descTableau = document.getElementById("desc-tableau");

  if (tableActive === "app_bob") {
    if (sectionAjout) sectionAjout.style.display = "block";
    if (titreTableau) titreTableau.textContent = "👥 Matrice des Accès (Utilisateurs & Chantiers)";
    if (descTableau) descTableau.textContent = "Coche ou décoche directement pour modifier les accès en temps réel.";
  } else if (tableActive === "blindage") {
    if (sectionAjout) sectionAjout.style.display = "none";
    if (titreTableau) titreTableau.textContent = "🏗️ Pilotage de la table Blindage";
    if (descTableau) descTableau.textContent = "Utilise les filtres sous chaque colonne pour rechercher (ex: support, chantier...).";
  } else if (tableActive === "suivi_tx_cat") {
    if (sectionAjout) sectionAjout.style.display = "none";
    if (titreTableau) titreTableau.textContent = "⚡ Suivi des Travaux Caténaires (suivi_tx_cat)";
    if (descTableau) descTableau.textContent = "Pilote l'avancement des tâches et observations par support.";
  }

  chargerTableauGlobal();
}

/* ============================================================
   PILOTAGE GLOBAL DES TABLES & FILTRAGE FAÇON EXCEL
   ============================================================ */
async function chargerTableauGlobal() {
  const container = document.getElementById("utilisateurs-container");
  if (!container) return;
  container.innerHTML = `<p style="color:#666; font-size:0.9em;">Chargement des données de ${tableActive}...</p>`;

  try {
    const { data, error } = await supabaseClient
      .from(tableActive)
      .select('*')
      .range(0, 9999);

    if (error) throw error;

    if (!data || data.length === 0) {
      container.innerHTML = `<p style="color:#999; font-size:0.9em;">Aucune donnée trouvée dans ${tableActive}.</p>`;
      return;
    }

    donneesBrutes = data;
    afficherTableauFiltre();

  } catch (err) {
    console.error("Erreur chargement :", err);
    container.innerHTML = `<p style="color:#dc2626; font-size:0.9em;">Erreur lors du chargement de la table '${tableActive}'.</p>`;
  }
}

function afficherTableauFiltre() {
  const container = document.getElementById("utilisateurs-container");
  if (!donneesBrutes || donneesBrutes.length === 0) return;

  const colonnes = Object.keys(donneesBrutes[0]);

  // Récupération des valeurs des filtres saisis par l'utilisateur
  const filtres = {};
  colonnes.forEach(col => {
    const inputFiltre = document.getElementById(`filtre-${col}`);
    filtres[col] = inputFiltre ? inputFiltre.value.toLowerCase().trim() : "";
  });

  // Filtrage des données brutes
  const donneesFiltrees = donneesBrutes.filter(row => {
    return colonnes.every(col => {
      if (!filtres[col]) return true;
      const valCellule = String(row[col] !== null && row[col] !== undefined ? row[col] : "").toLowerCase();
      return valCellule.includes(filtres[col]);
    });
  });

  // Construction du HTML avec en-têtes et lignes de filtres fixes (sticky)
  let html = `
    <style>
      .tableau-excel-container {
        max-height: 650px;
        overflow-y: auto;
        overflow-x: auto;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
      }
      .tableau-excel-container table {
        width: 100%;
        border-collapse: collapse;
        white-space: nowrap;
      }
      .tableau-excel-container th, .tableau-excel-container td {
        padding: 6px 8px;
        font-size: 0.8em;
        border-bottom: 1px solid #eee;
        background: #fff;
      }
      .tableau-excel-container thead tr:nth-child(1) th {
        position: sticky;
        top: 0;
        background: #f3f4f6;
        z-index: 10;
        border-bottom: 2px solid #d1d5db;
        text-transform: uppercase;
        font-size: 0.75em;
        color: #374151;
      }
      .tableau-excel-container thead tr:nth-child(2) th {
        position: sticky;
        top: 31px;
        background: #f9fafb;
        z-index: 9;
        border-bottom: 2px solid #d1d5db;
        padding: 4px 6px;
      }
      .input-filtre-colonne {
        width: 100%;
        padding: 4px 6px;
        font-size: 0.75em;
        border: 1px solid #cbd5e1;
        border-radius: 4px;
        box-sizing: border-box;
      }
    </style>

    <div class="tableau-excel-container">
      <table>
        <thead>
          <!-- Ligne 1 : Noms des colonnes -->
          <tr>
  `;

  colonnes.forEach(col => {
    html += `<th>${col}</th>`;
  });

  html += `
          </tr>
          <!-- Ligne 2 : Champs de recherche par colonne (façon Excel) -->
          <tr>
  `;

  colonnes.forEach(col => {
    const valeurFiltreActuel = filtres[col] || "";
    html += `
      <th>
        <input type="text" id="filtre-${col}" value="${valeurFiltreActuel}" placeholder="Filtrer..." class="input-filtre-colonne" oninput="afficherTableauFiltre()">
      </th>
    `;
  });

  html += `
          </tr>
        </thead>
        <tbody>
  `;

  if (donneesFiltrees.length === 0) {
    html += `<tr><td colspan="${colonnes.length}" style="text-align: center; color: #999; padding: 20px;">Aucun résultat trouvé pour ces filtres.</td></tr>`;
  } else {
    donneesFiltrees.forEach(row => {
      const idLigne = row.id;

      html += `<tr>`;
      colonnes.forEach(col => {
        let valeur = row[col];

        // 1. Colonnes en lecture seule
        if (col === 'id' || col === 'created_at' || col === 'updated_at') {
          html += `<td style="color: #888;">${valeur !== null && valeur !== undefined ? valeur : ''}</td>`;
        }
        // 2. Booléens en cases à cocher (comme la colonne 'Fait')
        else if (typeof valeur === 'boolean' || valeur === true || valeur === false) {
          const estCoche = valeur ? 'checked' : '';
          html += `<td style="text-align: center;">
                    <input type="checkbox" ${estCoche} onchange="modifierCaseSupabase(${idLigne}, '${col}', this.checked)" style="transform: scale(1.1); cursor: pointer;">
                   </td>`;
        } 
        // 3. Champs texte éditables (comme 'Chantier', 'Support', 'Tache', 'Observation')
        else {
          if (valeur === null || valeur === undefined) valeur = '';
          let extraAttr = (col === 'entreprise') ? `oninput="this.value = this.value.toUpperCase()"` : '';

          html += `<td>
                    <input type="text" value="${valeur}" ${extraAttr} onchange="modifierChampTexteSupabase(${idLigne}, '${col}', this.value)" style="padding: 4px; font-size: 0.8em; border: 1px solid #ccc; border-radius: 4px; width: 110px;">
                   </td>`;
        }
      });
      html += `</tr>`;
    });
  }

  html += `</tbody></table></div>`;
  container.innerHTML = html;
}

async function modifierCaseSupabase(idLigne, colonne, nouvelleValeur) {
  try {
    const updateData = {};
    updateData[colonne] = nouvelleValeur;

    const { error } = await supabaseClient
      .from(tableActive)
      .update(updateData)
      .eq('id', String(idLigne)); 

    if (error) throw error;
    
    const ligneModifiee = donneesBrutes.find(r => r.id == idLigne);
    if (ligneModifiee) ligneModifiee[colonne] = nouvelleValeur;

    console.log(`Mise à jour [${colonne}] validée dans ${tableActive} !`);
  } catch (err) {
    console.error("Erreur détaillée Supabase :", err);
    alert("❌ Erreur lors de la mise à jour : " + (err.message || err));
    chargerTableauGlobal();
  }
}

async function modifierChampTexteSupabase(idLigne, colonne, nouvelleValeur) {
  try {
    const updateData = {};
    updateData[colonne] = (colonne === 'entreprise') ? nouvelleValeur.trim().toUpperCase() : nouvelleValeur.trim();

    const { error } = await supabaseClient
      .from(tableActive)
      .update(updateData)
      .eq('id', String(idLigne));

    if (error) throw error;

    const ligneModifiee = donneesBrutes.find(r => r.id == idLigne);
    if (ligneModifiee) ligneModifiee[colonne] = updateData[colonne];

    console.log(`Mise à jour [${colonne}] validée pour l'ID ${idLigne} dans ${tableActive} !`);
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
