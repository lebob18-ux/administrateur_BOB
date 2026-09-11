/* ============================================================
   CONFIGURATION SUPABASE
   ============================================================ */
const SUPABASE_URL = "https://thbqkeugjvsxbryfnzuo.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_2-Ij-nrTPeK6rB-kSD-QTg_b42zNakq";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const MOT_DE_PASSE_ADMIN = "Lebob18";

// Variable pour suivre la table active, les données et la ligne sélectionnée
let tableActive = "app_bob";
let donneesBrutes = [];
let idLigneSelectionnee = null;

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
  idLigneSelectionnee = null; // Réinitialiser la sélection au changement
  
  const sectionAjout = document.getElementById("section-ajout");
  const titreTableau = document.getElementById("titre-tableau");
  const descTableau = document.getElementById("desc-tableau");

  if (tableActive === "app_bob") {
    if (sectionAjout) sectionAjout.style.display = "block";
    if (titreTableau) titreTableau.textContent = "👥 Matrice des Accès (Utilisateurs & Chantiers)";
    if (descTableau) descTableau.textContent = "Coche ou décoche directement pour modifier les accès en temps réel.";
    chargerTableauGlobal();
  } else if (tableActive === "blindage") {
    if (sectionAjout) sectionAjout.style.display = "none";
    if (titreTableau) titreTableau.textContent = "🏗️ Pilotage de la table Blindage";
    if (descTableau) descTableau.textContent = "Utilise les filtres au-dessus de chaque colonne pour rechercher.";
    chargerTableauGlobal();
  } else if (tableActive === "suivi_tx_cat") {
    if (sectionAjout) sectionAjout.style.display = "none";
    if (titreTableau) titreTableau.textContent = "⚡ Suivi des Travaux Caténaires (suivi_tx_cat)";
    if (descTableau) descTableau.textContent = "Pilote l'avancement des tâches et observations par support.";
    chargerTableauGlobal();
  } else if (tableActive === "recap_chantiers") {
    if (sectionAjout) sectionAjout.style.display = "none";
    if (titreTableau) titreTableau.textContent = "📊 Récapitulatif Global des Chantiers";
    if (descTableau) descTableau.textContent = "Synthèse croisée des volumes de blindage et de l'avancement des caténaires.";
    chargerRecapitulatifChantiers();
  }
}

/* ============================================================
   PILOTAGE GLOBAL DES TABLES & RECHERCHE SANS PERTE DE FOCUS
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
    initialiserStructureTableau();
    filtrerLignesTableau();

  } catch (err) {
    console.error("Erreur chargement :", err);
    container.innerHTML = `<p style="color:#dc2626; font-size:0.9em;">Erreur lors du chargement de la table '${tableActive}'.</p>`;
  }
}

// Crée la structure fixe du tableau une seule fois
function initialiserStructureTableau() {
  const container = document.getElementById("utilisateurs-container");
  if (!donneesBrutes || donneesBrutes.length === 0) return;

  const colonnes = Object.keys(donneesBrutes[0]);

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
      /* Effet de survol standard de la ligne */
      .tableau-excel-container tbody tr:hover td {
        background-color: #f1f5f9 !important;
      }
      /* Style de la ligne sélectionnée (clic sur l'ID) */
      .tableau-excel-container tbody tr.ligne-selectionnee td {
        background-color: #fdf4ff !important;
        border-top: 1px solid #7C2270;
        border-bottom: 1px solid #7C2270;
      }
      /* Ligne de recherche tout en haut (sticky 1) */
      .tableau-excel-container thead tr:nth-child(1) th {
        position: sticky;
        top: 0;
        background: #f9fafb;
        z-index: 10;
        border-bottom: 2px solid #d1d5db;
        padding: 6px;
      }
      /* En-têtes des colonnes juste en dessous (sticky 2) */
      .tableau-excel-container thead tr:nth-child(2) th {
        position: sticky;
        top: 41px; 
        background: #f3f4f6;
        z-index: 9;
        border-bottom: 2px solid #d1d5db;
        text-transform: uppercase;
        font-size: 0.75em;
        color: #374151;
        padding: 8px;
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
          <!-- Ligne 1 : Champs de recherche au-dessus des en-têtes -->
          <tr>
  `;

  colonnes.forEach(col => {
    html += `
      <th>
        <input type="text" id="filtre-${col}" placeholder="Filtrer..." class="input-filtre-colonne" oninput="filtrerLignesTableau()">
      </th>
    `;
  });

  html += `
          </tr>
          <!-- Ligne 2 : Noms des colonnes -->
          <tr>
  `;

  colonnes.forEach(col => {
    html += `<th>${col}</th>`;
  });

  html += `
          </tr>
        </thead>
        <tbody id="corps-tableau-supabase">
        </tbody>
      </table>
    </div>
  `;

  container.innerHTML = html;
}

// Met à jour uniquement le contenu du <tbody> pour garder le focus clavier intact
function filtrerLignesTableau() {
  const tbody = document.getElementById("corps-tableau-supabase");
  if (!tbody || !donneesBrutes || donneesBrutes.length === 0) return;

  const colonnes = Object.keys(donneesBrutes[0]);

  // Récupérer les filtres actifs
  const filtres = {};
  colonnes.forEach(col => {
    const inputFiltre = document.getElementById(`filtre-${col}`);
    filtres[col] = inputFiltre ? inputFiltre.value.toLowerCase().trim() : "";
  });

  // Filtrer les données
  const donneesFiltrees = donneesBrutes.filter(row => {
    return colonnes.every(col => {
      if (!filtres[col]) return true;
      const valCellule = String(row[col] !== null && row[col] !== undefined ? row[col] : "").toLowerCase();
      return valCellule.includes(filtres[col]);
    });
  });

  let htmlRows = "";

  if (donneesFiltrees.length === 0) {
    htmlRows = `<tr><td colspan="${colonnes.length}" style="text-align: center; color: #999; padding: 20px;">Aucun résultat trouvé pour ces filtres.</td></tr>`;
  } else {
    donneesFiltrees.forEach(row => {
      const idLigne = row.id;
      const estSelectionne = (idLigne === idLigneSelectionnee) ? "ligne-selectionnee" : "";

      htmlRows += `<tr class="${estSelectionne}">`;
      colonnes.forEach(col => {
        let valeur = row[col];

        // 1. Colonnes en lecture seule / Identifiant cliquable
        if (col === 'id') {
          htmlRows += `<td onclick="basculerSelectionLigne(${idLigne})" style="color: #7C2270; font-weight: bold; cursor: pointer;" title="Cliquer pour fixer/libérer la ligne">${valeur}</td>`;
        } else if (col === 'created_at' || col === 'updated_at') {
          htmlRows += `<td style="color: #888;">${valeur !== null && valeur !== undefined ? valeur : ''}</td>`;
        }
        // 2. Booléens ou colonne 'Fait' en cases à cocher robustes
        else if (col === 'Fait' || typeof valeur === 'boolean' || valeur === true || valeur === false) {
          const estCoche = (valeur === true || valeur === 'true') ? 'checked' : '';
          htmlRows += `<td style="text-align: center;">
                        <input type="checkbox" ${estCoche} onchange="modifierCaseSupabase(${idLigne}, '${col}', this.checked)" style="transform: scale(1.1); cursor: pointer;">
                       </td>`;
        } 
        // 3. Champs texte éditables
        else {
          if (valeur === null || valeur === undefined) valeur = '';
          let extraAttr = (col === 'entreprise') ? `oninput="this.value = this.value.toUpperCase()"` : '';

          htmlRows += `<td>
                        <input type="text" value="${valeur}" ${extraAttr} onchange="modifierChampTexteSupabase(${idLigne}, '${col}', this.value)" style="padding: 4px; font-size: 0.8em; border: 1px solid #ccc; border-radius: 4px; width: 110px;">
                       </td>`;
        }
      });
      htmlRows += `</tr>`;
    });
  }

  tbody.innerHTML = htmlRows;
}

// Fonction pour basculer la sélection d'une ligne en cliquant sur son ID
function basculerSelectionLigne(idLigne) {
  if (idLigneSelectionnee === idLigne) {
    idLigneSelectionnee = null;
  } else {
    idLigneSelectionnee = idLigne;
  }
  filtrerLignesTableau();
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

/* ============================================================
   RÉCAPITULATIF GLOBAL PAR CHANTIER
   ============================================================ */
async function chargerRecapitulatifChantiers() {
  const container = document.getElementById("utilisateurs-container");
  if (!container) return;
  container.innerHTML = `<p style="color:#666; font-size:0.9em;">Génération de la synthèse globale en cours...</p>`;

  try {
    const [resBlindage, resCat] = await Promise.all([
      supabaseClient.from('blindage').select('*').range(0, 9999),
      supabaseClient.from('suivi_tx_cat').select('*').range(0, 9999)
    ]);

    if (resBlindage.error) throw resBlindage.error;
    if (resCat.error) throw resCat.error;

    const dataBlindage = resBlindage.data || [];
    const dataCat = resCat.data || [];

    const chantiersMap = {};

    // Traitement Blindage
    dataBlindage.forEach(row => {
      const chantier = row.chantier ? row.chantier.trim().toUpperCase() : "INCONNU";
      if (!chantiersMap[chantier]) {
        chantiersMap[chantier] = { m3PrevuTotal: 0, m3PrevuADate: 0, m3ReelDate: 0, totalTaches: 0, tachesFaites: 0 };
      }

      const m3Prevu = parseFloat(row.m3_prevu || row.m3_prevu_total || 0);
      const m3Reel = parseFloat(row.m3_reel || row.m3_reel_date || 0);

      chantiersMap[chantier].m3PrevuTotal += m3Prevu;

      // Prévu à date : Somme des prévus uniquement si le réel n'est ni null/undefined ni zéro
      if (row.m3_reel !== null && row.m3_reel !== undefined && m3Reel !== 0) {
        chantiersMap[chantier].m3PrevuADate += m3Prevu;
      }

      chantiersMap[chantier].m3ReelDate += m3Reel;
    });

    // Traitement Caténaires (suivi_tx_cat)
    dataCat.forEach(row => {
      const chantier = row.Chantier ? row.Chantier.trim().toUpperCase() : "INCONNU";
      if (!chantiersMap[chantier]) {
        chantiersMap[chantier] = { m3PrevuTotal: 0, m3PrevuADate: 0, m3ReelDate: 0, totalTaches: 0, tachesFaites: 0 };
      }
      chantiersMap[chantier].totalTaches += 1;
      if (row.Fait === true || row.Fait === 'true') {
        chantiersMap[chantier].tachesFaites += 1;
      }
    });

    let html = `
      <div style="overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse; white-space: nowrap; font-size: 0.85em;">
          <thead>
            <tr style="background: #f3f4f6; color: #374151; text-transform: uppercase; font-size: 0.75em;">
              <th style="padding: 10px; border-bottom: 2px solid #d1d5db; text-align: left;">Chantier</th>
              <th style="padding: 10px; border-bottom: 2px solid #d1d5db; text-align: center;">Béton : Total (m³)</th>
              <th style="padding: 10px; border-bottom: 2px solid #d1d5db; text-align: center;">Béton : Date (m³)</th>
              <th style="padding: 10px; border-bottom: 2px solid #d1d5db; text-align: center;">Béton : Calculé à Date (m³)</th>
              <th style="padding: 10px; border-bottom: 2px solid #d1d5db; text-align: center;">Caténaires : Avancement Tâches</th>
              <th style="padding: 10px; border-bottom: 2px solid #d1d5db; text-align: center;">Taux de Réalisation Caténaires</th>
            </tr>
          </thead>
          <tbody>
    `;

    const nomsChantiers = Object.keys(chantiersMap).sort();

    if (nomsChantiers.length === 0) {
      html += `<tr><td colspan="6" style="text-align: center; color: #999; padding: 20px;">Aucune donnée disponible pour le récapitulatif.</td></tr>`;
    } else {
      nomsChantiers.forEach(chantier => {
        const c = chantiersMap[chantier];
        const tauxCat = c.totalTaches > 0 ? Math.round((c.tachesFaites / c.totalTaches) * 100) : 0;
        
        let couleurBadge = "#dc2626";
        if (tauxCat > 40) couleurBadge = "#d97706";
        if (tauxCat > 80) couleurBadge = "#16a34a";

        html += `
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px; font-weight: bold; color: #7C2270;">🏢 ${chantier}</td>
            <td style="padding: 10px; text-align: center;">${c.m3PrevuTotal.toFixed(1)}</td>
            <td style="padding: 10px; text-align: center; color: #2563eb; font-weight: bold;">${c.m3PrevuADate.toFixed(1)}</td>
            <td style="padding: 10px; text-align: center; font-weight: bold;">${c.m3ReelDate.toFixed(1)}</td>
            <td style="padding: 10px; text-align: center;">${c.tachesFaites} / ${c.totalTaches} tâches</td>
            <td style="padding: 10px; text-align: center;">
              <div style="background: #e5e7eb; border-radius: 4px; overflow: hidden; display: inline-block; width: 100px; height: 14px; vertical-align: middle; margin-right: 6px;">
                <div style="background: ${couleurBadge}; width: ${tauxCat}%; height: 100%;"></div>
              </div>
              <span style="font-size: 0.8em; font-weight: bold;">${tauxCat}%</span>
            </td>
          </tr>
        `;
      });
    }

    html += `</tbody></table></div>`;
    container.innerHTML = html;

  } catch (err) {
    console.error("Erreur récapitulatif :", err);
    container.innerHTML = `<p style="color:#dc2626; font-size:0.9em;">Erreur lors du calcul du récapitulatif des chantiers.</p>`;
  }
}
