import { Person } from '../models/deduction.models';

/**
 * Distribution de chaque décor : 30 personnages. À chaque affaire, le générateur
 * en tire autant que la grille a de lignes, et l'un d'eux devient la victime.
 * Chaque id correspond à un portrait src/assets/characters/<id>.svg (tools/gen-pixel.mjs).
 */
const cast = (list: [string, string, string][]): Person[] => list.map(([id, name, role]) => ({ id, name, role }));

export const CAST_MANOIR = cast([
  ['plaquiste', 'Hugo le Plaquiste', 'plaquiste'], ['notaire', 'Léa la Notaire', 'notaire'],
  ['peintre', 'Sofia la Peintre', 'peintre'], ['jardinier', 'Marco le Jardinier', 'jardinier'],
  ['libraire', 'Inès la Libraire', 'libraire'], ['medecin', 'Dr. Blanche', 'médecin'],
  ['cuisinier', 'Gaston le Cuisinier', 'cuisinier'], ['gouvernante', 'Maud la Gouvernante', 'gouvernante'],
  ['majordome', 'Alfred le Majordome', 'majordome'], ['comtesse', 'Comtesse Irène', 'comtesse'],
  ['colonel', 'Colonel Briand', 'colonel'], ['baronne', 'Baronne Adèle', 'baronne'],
  ['pianiste', 'Elias le Pianiste', 'pianiste'], ['poete', 'Victor le Poète', 'poète'],
  ['chauffeur', 'René le Chauffeur', 'chauffeur'], ['heritier', "Lucas l'Héritier", 'héritier'],
  ['veuve', 'Edith la Veuve', 'veuve'], ['antiquaire', "Anatole l'Antiquaire", 'antiquaire'],
  ['sommelier', 'Bastien le Sommelier', 'sommelier'], ['cartomancienne', 'Madame Zelda', 'cartomancienne'],
  ['photographe', 'Jules le Photographe', 'photographe'], ['professeur', 'Professeur Lenoir', 'professeur'],
  ['nourrice', 'Rosa la Nourrice', 'nourrice'], ['gardechasse', 'Firmin le Garde-chasse', 'garde-chasse'],
  ['architecte', "Kofi l'Architecte", 'architecte'], ['actrice', "Lola l'Actrice", 'actrice'],
  ['archeologue', "Indra l'Archéologue", 'archéologue'], ['avocat', "Maître Diallo", 'avocat'],
  ['banquier', 'Edgar le Banquier', 'banquier'], ['explorateur', "Hector l'Explorateur", 'explorateur'],
]);

export const CAST_HANTE = cast([
  ['vampire', 'Vlad le Vampire', 'vampire'], ['sorciere', 'Morgane la Sorcière', 'sorcière'],
  ['zombie', 'Zef le Zombie', 'zombie'], ['loupgarou', 'Rémus le Loup-Garou', 'loup-garou'],
  ['momie', 'Aménia la Momie', 'momie'], ['squelette', 'Oscar le Squelette', 'squelette'],
  ['fantome', 'Ophélie le Fantôme', 'fantôme'], ['epouvantail', "Jack l'Épouvantail", 'épouvantail'],
  ['creature', 'Boris la Créature', 'créature'], ['banshee', 'Nora la Banshee', 'banshee'],
  ['goule', 'Gorgo la Goule', 'goule'], ['gargouille', 'Grégoire la Gargouille', 'gargouille'],
  ['diablotin', 'Fifi le Diablotin', 'diablotin'], ['nonne', 'Sœur Agathe', 'nonne spectrale'],
  ['pirate', 'Barbe-Grise le Pirate', 'pirate fantôme'], ['poupee', 'Annabelle la Poupée', 'poupée maudite'],
  ['potiron', 'Potiron la Citrouille', 'citrouille'], ['chasseur', 'Abraham le Chasseur', 'chasseur de vampires'],
  ['medium', 'Madame Irma', 'médium'], ['necromancien', 'Mortis le Nécromancien', 'nécromancien'],
  ['cyclope', 'Polyphème le Cyclope', 'cyclope'], ['sorcier', 'Ambrose le Sorcier', 'sorcier'],
  ['fossoyeur', 'Gaspard le Fossoyeur', 'fossoyeur'], ['croquemitaine', 'Le Croquemitaine', 'croquemitaine'],
  ['demone', 'Lilith la Démone', 'démone'], ['igor', "Igor l'Assistant", 'assistant'],
  ['carmilla', 'Carmilla la Vampire', 'vampire'], ['ogre', "Gargan l'Ogre", 'ogre'],
  ['chevalier', 'Sir Gauvain', 'chevalier spectral'], ['nyx', 'Nyx la Chauve-souris', 'femme chauve-souris'],
]);

export const CAST_BUREAUX = cast([
  ['secretaire', 'Nadia la Secrétaire', 'secrétaire'], ['comptable', 'Paul le Comptable', 'comptable'],
  ['directrice', 'Hélène la Directrice', 'directrice'], ['stagiaire', 'Théo le Stagiaire', 'stagiaire'],
  ['vigile', 'Momo le Vigile', 'vigile'], ['pdg', 'M. Bernard, le PDG', 'PDG'],
  ['developpeur', 'Yanis le Développeur', 'développeur'], ['designer', 'Zoé la Designer', 'designer'],
  ['drh', 'Sylvie la DRH', 'DRH'], ['commercial', 'Kevin le Commercial', 'commercial'],
  ['juriste', 'Aïcha la Juriste', 'juriste'], ['informaticien', "Tom l'Informaticien", 'informaticien'],
  ['standardiste', 'Julie la Standardiste', 'standardiste'], ['coursier', 'Moussa le Coursier', 'coursier'],
  ['agentmenage', "Fatou l'Agente d'entretien", "agente d'entretien"], ['consultante', 'Claire la Consultante', 'consultante'],
  ['analyste', "Karim l'Analyste", 'analyste'], ['chefprojet', 'Margot la Cheffe de projet', 'cheffe de projet'],
  ['assistante', "Awa l'Assistante", 'assistante'], ['community', 'Lou la Community manager', 'community manager'],
  ['daf', 'Gérard le Directeur financier', 'directeur financier'], ['auditrice', "Odile l'Auditrice", 'auditrice'],
  ['acheteur', "Samir l'Acheteur", 'acheteur'], ['formatrice', 'Grace la Formatrice', 'formatrice'],
  ['barista', 'Hugo le Barista', 'barista'], ['syndicaliste', 'Roger le Délégué syndical', 'délégué syndical'],
  ['paie', 'Emma la Gestionnaire de paie', 'gestionnaire de paie'], ['livreur', 'Ibrahim le Livreur', 'livreur'],
  ['traductrice', 'Yasmine la Traductrice', 'traductrice'], ['archiviste', "Léon l'Archiviste", 'archiviste'],
]);

export const CAST_USINE = cast([
  ['ouvrier', "Kevin l'Ouvrier", 'ouvrier'], ['contremaitre', 'Joël le Contremaître', 'contremaître'],
  ['ingenieure', "Sarah l'Ingénieure", 'ingénieure'], ['soudeur', 'Dimitri le Soudeur', 'soudeur'],
  ['cariste', 'Manu le Cariste', 'cariste'], ['electricienne', "Chloé l'Électricienne", 'électricienne'],
  ['mecanicien', 'Rachid le Mécanicien', 'mécanicien'], ['chimiste', 'Albert le Chimiste', 'chimiste'],
  ['magasinier', 'Bruno le Magasinier', 'magasinier'], ['routier', 'Patrick le Routier', 'routier'],
  ['directeurusine', "M. Vasseur, le Directeur d'usine", "directeur d'usine"], ['qualiticienne', 'Mei la Qualiticienne', 'qualiticienne'],
  ['maintenance', 'Franck le Technicien', 'technicien de maintenance'], ['fondeur', 'Igor le Fondeur', 'fondeur'],
  ['carrossier', 'Kylian le Carrossier', 'carrossier'], ['tourneur', 'Ousmane le Tourneur', 'tourneur'],
  ['chaudronnier', 'Ernest le Chaudronnier', 'chaudronnier'], ['infirmiere', "Nathalie l'Infirmière", 'infirmière'],
  ['cantiniere', 'Josiane la Cantinière', 'cantinière'], ['gardien', 'Mamadou le Gardien', 'gardien de nuit'],
  ['logisticienne', 'Aminata la Logisticienne', 'logisticienne'], ['apprenti', "Enzo l'Apprenti", 'apprenti'],
  ['hse', 'Valérie la Responsable sécurité', 'responsable sécurité'], ['grutier', 'Marcel le Grutier', 'grutier'],
  ['emballeuse', "Linh l'Emballeuse", 'emballeuse'], ['ajusteur', "Raymond l'Ajusteur", 'ajusteur'],
  ['roboticienne', 'Ada la Roboticienne', 'roboticienne'], ['laborantine', 'Precious la Laborantine', 'laborantine'],
  ['inspecteur', "M. Lebrun, l'Inspecteur", 'inspecteur du travail'], ['docker', 'Yvon le Docker', 'docker'],
]);
