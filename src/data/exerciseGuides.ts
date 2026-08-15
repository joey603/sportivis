/**
 * Consignes d'exécution en français, 2 à 4 points clés par exercice.
 * Complète les photos de démonstration (voir exerciseMedia.ts).
 */

export const EXERCISE_GUIDES: Record<string, string[]> = {
  // —— Pectoraux ——
  'chest-press-machine': [
    'Règle le siège pour que les poignées soient à hauteur du milieu de poitrine.',
    'Garde les omoplates serrées contre le dossier pendant toute la poussée.',
    'Ne verrouille pas les coudes en fin de mouvement, garde la tension.',
  ],
  'pec-deck': [
    'Coudes à hauteur d’épaules, légèrement fléchis et calés sur les coussins.',
    'Rapproche les bras en pensant à serrer les pectoraux, pas à pousser fort.',
    'Reviens lentement jusqu’à sentir l’étirement, sans forcer l’épaule.',
  ],
  'bench-press-bar': [
    'Pieds ancrés au sol, omoplates serrées et légère cambrure lombaire.',
    'Descends la barre vers le bas des pectoraux, coudes à environ 45°.',
    'Pousse en ligne droite vers le haut sans décoller les fessiers.',
  ],
  'incline-bench-bar': [
    'Banc incliné à 30–45° : au-delà, ce sont les épaules qui travaillent.',
    'Descends la barre vers le haut des pectoraux, sous les clavicules.',
    'Garde les poignets alignés au-dessus des coudes.',
  ],
  'decline-bench-bar': [
    'Cale bien les jambes avant de décrocher la barre.',
    'Descends vers le bas des pectoraux, amplitude plus courte qu’au couché plat.',
    'Idéal si le développé plat gêne tes épaules.',
  ],
  'db-bench-flat': [
    'Amène les haltères en position avec les genoux, puis allonge-toi.',
    'Descends jusqu’à ce que les coudes soient légèrement sous la ligne du torse.',
    'Rapproche les haltères en haut sans les cogner.',
  ],
  'db-bench-incline': [
    'Banc à 30°, haltères au niveau du haut des pectoraux.',
    'Trajectoire légèrement convergente vers le haut.',
    'Contrôle la descente sur 2 à 3 secondes.',
  ],
  'cable-crossover': [
    'Poulies hautes, un pied légèrement avancé pour la stabilité.',
    'Bras quasi tendus, coudes juste déverrouillés, croise devant les hanches.',
    'La tension reste constante : ne relâche pas en position haute.',
  ],
  'cable-fly': [
    'Buste penché en avant, dos plat, coudes fixes et légèrement fléchis.',
    'Rassemble les mains devant la poitrine en contractant les pectoraux.',
    'Retour lent jusqu’à l’étirement complet.',
  ],
  'cable-fly-low': [
    'Poulies basses : mouvement du bas vers le haut pour cibler le haut des pectoraux.',
    'Termine mains à hauteur de visage, paumes vers le haut.',
    'Charge légère, priorité à la sensation.',
  ],
  'db-fly-flat': [
    'Coudes légèrement fléchis et bloqués dans cet angle tout le mouvement.',
    'Ouvre jusqu’à sentir l’étirement pectoral, sans descendre trop bas.',
    'Referme comme si tu enlaçais un tronc d’arbre.',
  ],
  'db-fly-incline': [
    'Banc à 30°, même mécanique que l’écarté plat.',
    'Cible le faisceau supérieur des pectoraux.',
    'Charge modérée : c’est un exercice d’isolation.',
  ],
  pushups: [
    'Mains un peu plus larges que les épaules, corps gainé en planche.',
    'Descends jusqu’à ce que la poitrine soit à quelques centimètres du sol.',
    'Ne laisse pas les hanches s’affaisser ni le bassin monter.',
  ],
  'pushups-decline': [
    'Pieds surélevés sur un banc : plus de charge sur le haut des pectoraux.',
    'Garde le corps parfaitement aligné, sans creuser les lombaires.',
  ],
  'pushups-incline': [
    'Mains surélevées sur un banc : version plus facile pour progresser.',
    'Plus le support est haut, plus l’exercice est accessible.',
  ],
  'smith-bench': [
    'Trajectoire guidée : place le banc pour que la barre descende sur les pectoraux.',
    'Utile pour charger lourd en sécurité sans partenaire.',
  ],

  // —— Dos ——
  'lat-pulldown': [
    'Cale bien les cuisses sous les coussins, buste très légèrement en arrière.',
    'Tire les coudes vers le bas et l’arrière, barre vers le haut de la poitrine.',
    'Pense à descendre les omoplates avant de plier les bras.',
  ],
  'lat-pulldown-uni': [
    'Une poignée à la fois : amplitude plus grande et correction des asymétries.',
    'Laisse l’épaule monter en haut, puis tire en abaissant l’omoplate.',
  ],
  'seated-row-cable': [
    'Dos plat, buste quasi vertical, genoux légèrement fléchis.',
    'Tire la poignée vers le nombril en serrant les omoplates.',
    'Évite de balancer le buste pour tricher.',
  ],
  'seated-row-machine': [
    'Poitrine contre le support, ce qui protège les lombaires.',
    'Tire les coudes vers l’arrière, sans hausser les épaules.',
  ],
  'chest-supported-row': [
    'Buste appuyé : zéro stress lombaire, focus total sur le dos.',
    'Tire jusqu’à ce que les coudes dépassent la ligne du torse.',
  ],
  't-bar-row': [
    'Dos plat, genoux fléchis, hanches en arrière.',
    'Tire vers le bas du sternum, coudes proches du corps.',
    'Garde le tronc immobile, seul le bras travaille.',
  ],
  'barbell-row': [
    'Buste incliné à environ 45°, dos plat et gainé.',
    'Tire la barre vers le nombril, coudes le long du corps.',
    'Ne redresse pas le buste pendant la traction.',
  ],
  'db-row': [
    'Un genou et une main sur le banc, dos parallèle au sol.',
    'Tire l’haltère vers la hanche, pas vers l’épaule.',
    'Évite la rotation du buste pour gagner de l’amplitude.',
  ],
  'cable-row-uni': [
    'Tension constante : idéal pour sentir le grand dorsal.',
    'Laisse l’épaule s’avancer en position basse, puis tire en la ramenant.',
  ],
  pullups: [
    'Prise pronation, mains un peu plus larges que les épaules.',
    'Monte jusqu’à ce que le menton dépasse la barre, sans à-coups.',
    'Descends complètement bras tendus pour l’amplitude maximale.',
  ],
  'pullups-weighted': [
    'Ajoute du lest seulement quand tu maîtrises 8–10 tractions propres.',
    'Ceinture de lest ou haltère entre les pieds.',
  ],
  'australian-pullups': [
    'Corps gainé sous la barre, talons au sol.',
    'Tire la poitrine vers la barre en serrant les omoplates.',
    'Plus le corps est horizontal, plus c’est difficile.',
  ],
  deadlift: [
    'Barre au-dessus du milieu du pied, tibias proches de la barre.',
    'Dos plat et gainé : pousse le sol avec les jambes, la barre reste collée aux jambes.',
    'Verrouille hanches et genoux en même temps, sans hyperextension lombaire.',
  ],
  'rack-pull': [
    'Barre posée sur les crochets à hauteur genoux ou mi-cuisse.',
    'Travaille la phase haute du soulevé, permet plus de charge.',
  ],
  'deficit-deadlift': [
    'Debout sur une plateforme de 3–5 cm : amplitude augmentée.',
    'Renforce le démarrage du soulevé, charge réduite.',
  ],
  superman: [
    'Allongé sur le ventre, décolle simultanément bras et jambes.',
    'Tiens 1 à 2 secondes en haut sans bloquer la respiration.',
  ],
  'dead-hang': [
    'Suspension bras tendus, épaules relâchées puis actives.',
    'Décompresse la colonne et renforce la prise.',
  ],
  'low-cable-row-uni': [
    'Poulie basse, un bras : cible l’épaisseur du dos.',
    'Tire vers la hanche en gardant le buste fixe.',
  ],

  // —— Épaules ——
  'shoulder-press-machine': [
    'Poignées à hauteur d’épaules, dos bien appuyé.',
    'Pousse vers le haut sans hausser les trapèzes.',
    'Descends jusqu’à ce que les coudes soient à 90°.',
  ],
  'db-shoulder-press': [
    'Assis dossier haut, haltères à hauteur d’oreilles.',
    'Pousse en trajectoire légèrement convergente.',
    'Gaine les abdos pour ne pas cambrer les lombaires.',
  ],
  'military-press': [
    'Debout, pieds largeur bassin, gainage serré.',
    'Barre part du haut des pectoraux, passe devant le visage.',
    'En haut, la barre est au-dessus du milieu du crâne.',
  ],
  'arnold-press': [
    'Départ paumes vers toi, haltères devant le visage.',
    'Tourne les poignets vers l’extérieur en poussant.',
    'Charge légère, mouvement contrôlé pour protéger l’épaule.',
  ],
  'lateral-raise-db': [
    'Buste légèrement penché, coudes très légèrement fléchis.',
    'Monte jusqu’à l’horizontale, pas plus haut.',
    'Guide avec les coudes, pas avec les mains.',
  ],
  'lateral-raise-cable': [
    'Poulie basse derrière toi : tension maximale en position basse.',
    'Meilleure courbe de résistance que les haltères.',
  ],
  'front-raise-db': [
    'Monte devant toi jusqu’à hauteur d’épaules.',
    'Peu de volume nécessaire : le deltoïde avant travaille déjà aux poussées.',
  ],
  'rear-delt-fly-cable': [
    'Câbles croisés, buste incliné, ouvre les bras vers l’arrière.',
    'Pense à écarter les coudes, pas à tirer avec les mains.',
  ],
  'reverse-pec-deck': [
    'Face au dossier, poignées à hauteur d’épaules.',
    'Ouvre en serrant l’arrière des épaules et le milieu du dos.',
  ],
  'face-pull': [
    'Corde à hauteur de visage, tire vers le front en écartant les mains.',
    'Termine coudes hauts, paumes vers l’extérieur.',
    'Excellent pour la santé de l’épaule et la posture.',
  ],
  'landmine-press': [
    'Barre en angle : trajectoire naturelle, moins de contrainte articulaire.',
    'Pousse en diagonale vers le haut et l’avant.',
  ],
  'upright-row': [
    'Prise largeur épaules, tire les coudes vers le haut.',
    'Ne monte pas au-delà de la hauteur des pectoraux pour épargner l’épaule.',
  ],
  'pike-pushup': [
    'Bassin haut en V inversé, tête entre les mains.',
    'Descends le sommet du crâne vers le sol.',
    'Progression vers le handstand push-up.',
  ],

  // —— Biceps ——
  'curl-machine': [
    'Aisselles calées sur le pupitre, bras complètement appuyés.',
    'Impossible de tricher : isolation quasi parfaite du biceps.',
  ],
  'curl-bar': [
    'Coudes fixes le long du corps, pas de balancement du buste.',
    'Monte jusqu’à la contraction complète, descends lentement.',
  ],
  'curl-db-alt': [
    'Un bras après l’autre, buste immobile.',
    'Supine légèrement le poignet en montant pour finir la contraction.',
  ],
  'curl-hammer': [
    'Prise neutre, paumes face à face comme deux marteaux.',
    'Cible le brachial et l’avant-bras : donne de l’épaisseur au bras.',
  ],
  'curl-cable': [
    'Tension constante du bas jusqu’en haut.',
    'Parfait en finisher après les curls libres.',
  ],
  'curl-concentration': [
    'Assis, coude calé contre l’intérieur de la cuisse.',
    'Aucune triche possible : contraction maximale en haut.',
  ],
  'curl-incline': [
    'Dossier incliné, bras pendants derrière le corps.',
    'Étire au maximum le chef long du biceps.',
  ],
  'curl-preacher-db': [
    'Bras appuyé sur le pupitre incliné.',
    'Ne verrouille pas complètement le coude en bas.',
  ],
  'curl-spider': [
    'Buste sur banc incliné, bras verticaux vers le sol.',
    'Contraction maximale en haut, tension permanente.',
  ],

  // —— Triceps ——
  'triceps-pushdown': [
    'Coudes collés au corps, seuls les avant-bras bougent.',
    'Écarte légèrement la corde en fin d’extension.',
  ],
  'triceps-machine': [
    'Dos appuyé, coudes fixes sur les supports.',
    'Extension complète sans claquer l’articulation.',
  ],
  'triceps-overhead-cable': [
    'Bras au-dessus de la tête : étire la longue portion du triceps.',
    'Garde les coudes proches de la tête pendant l’extension.',
  ],
  'triceps-overhead-db': [
    'Un haltère à deux mains derrière la tête, coudes serrés.',
    'Descends jusqu’à l’étirement, remonte sans bouger les coudes.',
  ],
  'skull-crushers': [
    'Allongé, barre EZ descendue vers le front ou légèrement derrière.',
    'Coudes fixes pointant vers le plafond.',
  ],
  'close-grip-bench': [
    'Mains largeur épaules, coudes le long du corps.',
    'Le mouvement triceps le plus lourd que tu peux charger.',
  ],
  dips: [
    'Buste vertical pour cibler les triceps, penché pour les pectoraux.',
    'Descends jusqu’à 90° au coude, pas plus bas si l’épaule tire.',
  ],
  'bench-dips': [
    'Mains sur le banc derrière toi, jambes tendues devant.',
    'Descends en gardant les coudes serrés vers l’arrière.',
  ],
  'triceps-kickback': [
    'Buste penché, bras collé au corps et parallèle au sol.',
    'Extension complète, contraction 1 seconde en fin de course.',
  ],
  'diamond-pushups': [
    'Mains jointes formant un losange sous la poitrine.',
    'Coudes qui frottent les côtes : tout part des triceps.',
  ],

  // —— Quadriceps ——
  'leg-press': [
    'Pieds largeur bassin sur la plateforme, dos et bassin bien collés.',
    'Descends jusqu’à environ 90° au genou sans décoller les lombaires.',
    'Ne verrouille pas complètement les genoux en haut.',
  ],
  'leg-extension': [
    'Axe de rotation aligné avec le genou, dos appuyé.',
    'Extension complète, pause 1 seconde en haut.',
  ],
  'hack-squat': [
    'Dos collé au dossier, pieds à plat au milieu de la plateforme.',
    'Descends contrôlé, pousse à travers tout le pied.',
  ],
  'back-squat': [
    'Barre sur les trapèzes, pieds largeur épaules, orteils légèrement ouverts.',
    'Descends hanches en arrière et en bas, genoux dans l’axe des pieds.',
    'Garde le buste gainé et le regard neutre.',
  ],
  'front-squat': [
    'Barre sur les deltoïdes avant, coudes hauts.',
    'Buste plus vertical qu’au squat arrière : moins de contrainte lombaire.',
  ],
  'goblet-squat': [
    'Haltère tenu contre la poitrine, coudes vers l’intérieur.',
    'Excellent pour apprendre le pattern du squat.',
  ],
  'bulgarian-split': [
    'Pied arrière sur un banc, la majorité du poids sur la jambe avant.',
    'Descends verticalement, genou avant dans l’axe du pied.',
  ],
  'lunges-forward': [
    'Grand pas en avant, descends le genou arrière vers le sol.',
    'Buste droit, poussée sur la jambe avant pour revenir.',
  ],
  'lunges-reverse': [
    'Recule un pied puis descends : plus stable que la fente avant.',
    'Moins de contrainte sur le genou avant.',
  ],
  'walking-lunges': [
    'Enchaîne les fentes en avançant, sans marquer d’arrêt.',
    'Demande coordination et équilibre : commence léger.',
  ],
  'step-ups': [
    'Monte sur le banc en poussant uniquement avec la jambe du dessus.',
    'Ne prends pas d’élan avec la jambe restée au sol.',
  ],
  'bodyweight-squat': [
    'Pieds largeur épaules, bras devant pour l’équilibre.',
    'Descends au moins jusqu’aux cuisses parallèles au sol.',
  ],
  'leg-press-uni': [
    'Une jambe à la fois : corrige les asymétries.',
    'Charge environ 40–50 % de ta presse bilatérale.',
  ],
  'smith-squat': [
    'Trajectoire guidée, pieds légèrement avancés.',
    'Permet de charger sans gérer l’équilibre.',
  ],

  // —— Ischio-jambiers ——
  'leg-curl-seated': [
    'Bassin fléchi : position la plus efficace pour l’hypertrophie des ischios.',
    'Fléchis complètement, retour lent sans lâcher la charge.',
  ],
  'leg-curl-lying': [
    'Allongé face au banc, bassin collé au support.',
    'Ne décolle pas les hanches pour finir la répétition.',
  ],
  rdl: [
    'Genoux légèrement fléchis et fixes, charnière de hanche.',
    'Descends la barre le long des jambes jusqu’à l’étirement des ischios.',
    'Dos plat en permanence, remonte en poussant le bassin vers l’avant.',
  ],
  'rdl-db': [
    'Même charnière de hanche, haltères le long des jambes.',
    'Plus accessible pour apprendre le mouvement.',
  ],
  'rdl-single': [
    'Sur une jambe, l’autre part en arrière en prolongement du buste.',
    'Bassin reste horizontal : ne laisse pas la hanche s’ouvrir.',
  ],
  'good-morning': [
    'Barre sur les trapèzes, charnière de hanche buste vers l’avant.',
    'Charge légère : mouvement exigeant pour les lombaires.',
  ],
  'nordic-curl': [
    'Chevilles bloquées, descends le buste le plus lentement possible.',
    'Meilleur exercice de prévention des blessures aux ischios.',
  ],
  'trap-bar-dl': [
    'Poids centré, buste plus vertical qu’au soulevé barre.',
    'Le soulevé le plus sûr pour les lombaires fragiles.',
  ],

  // —— Fessiers ——
  'hip-thrust-bar': [
    'Haut du dos sur le banc, barre sur le pli de la hanche.',
    'Monte jusqu’à l’alignement épaules-hanches-genoux, menton rentré.',
    'Serre les fessiers 1 seconde en haut sans cambrer les lombaires.',
  ],
  'hip-thrust-machine': [
    'Setup rapide : idéal pour faire du volume sur les fessiers.',
    'Même verrouillage de hanche que la version barre.',
  ],
  'glute-bridge': [
    'Au sol, pieds proches des fessiers, monte le bassin.',
    'Pense à basculer le bassin plutôt qu’à cambrer.',
  ],
  'hip-abduction-machine': [
    'Écarte les cuisses contre la résistance, buste légèrement penché en avant.',
    'Cible le moyen fessier et la stabilité du bassin.',
  ],
  'hip-adduction-machine': [
    'Rapproche les cuisses de manière contrôlée.',
    'Renforce les adducteurs, souvent négligés.',
  ],
  'cable-kickback': [
    'Sangle à la cheville, extension de hanche vers l’arrière.',
    'Garde le buste immobile : pas de cambrure lombaire.',
  ],
  'cable-abduction': [
    'Jambe qui part sur le côté, tension constante.',
    'Isole le moyen fessier avec une amplitude contrôlée.',
  ],
  'cable-pull-through': [
    'Dos à la poulie basse, corde entre les jambes.',
    'Charnière de hanche : pousse le bassin en avant pour revenir.',
  ],
  'kb-swing': [
    'Mouvement de hanche explosif, pas un squat.',
    'Le kettlebell monte à hauteur de poitrine par l’élan des hanches.',
    'Bras relâchés, gainage serré, dos plat.',
  ],
  'sumo-squat-db': [
    'Pieds très écartés, orteils ouverts, haltère entre les jambes.',
    'Cible les adducteurs et les fessiers.',
  ],
  'reverse-hyper': [
    'Buste fixe sur le support, jambes qui remontent à l’horizontale.',
    'Décompresse les lombaires tout en travaillant fessiers et ischios.',
  ],

  // —— Mollets ——
  'calf-raise-machine': [
    'Amplitude complète : talons bien bas puis pointes hautes.',
    'Pause 1 seconde en haut, pas de rebond.',
  ],
  'calf-raise-standing': [
    'Jambes tendues : cible le gastrocnémien.',
    'Travaille lentement, le mollet répond au temps sous tension.',
  ],
  'calf-raise-seated': [
    'Genoux fléchis : cible davantage le soléaire.',
    'Complémentaire de la version debout.',
  ],
  'calf-raise-single': [
    'Une jambe à la fois : charge doublée, corrige les asymétries.',
    'Tiens-toi pour l’équilibre seulement.',
  ],
  'calf-press-legpress': [
    'Pointes de pieds sur le bas de la plateforme, genoux quasi tendus.',
    'Permet de charger lourd en sécurité.',
  ],

  // —— Core ——
  plank: [
    'Coudes sous les épaules, corps parfaitement aligné.',
    'Bassin en rétroversion légère, abdos et fessiers serrés.',
    'Respire normalement : si tu cambres, arrête la série.',
  ],
  'side-plank': [
    'Appui sur un coude, corps en ligne, hanches hautes.',
    'Cible les obliques et les stabilisateurs latéraux.',
  ],
  crunch: [
    'Enroule le buste, décolle seulement les omoplates.',
    'Ne tire pas sur la nuque avec les mains.',
  ],
  'cable-crunch': [
    'À genoux face à la poulie haute, corde derrière la tête.',
    'Enroule la colonne vers le bas, hanches fixes.',
    'Le seul exercice abdo vraiment progressif en charge.',
  ],
  'ab-machine': [
    'Enroule le buste contre la résistance, sans tirer avec les bras.',
    'Mouvement court et contrôlé.',
  ],
  'hanging-knee-raise': [
    'Suspendu, monte les genoux vers la poitrine.',
    'Évite le balancement : contrôle la descente.',
  ],
  'hanging-leg-raise': [
    'Jambes tendues jusqu’à l’horizontale ou plus haut.',
    'Bascule le bassin en fin de montée pour vraiment engager les abdos.',
  ],
  'dead-bug': [
    'Dos plaqué au sol, lombaires collées en permanence.',
    'Étends bras et jambe opposés en gardant le bassin immobile.',
  ],
  'russian-twist': [
    'Buste incliné, pieds au sol ou décollés selon le niveau.',
    'Rotation qui part des obliques, pas seulement des bras.',
  ],
  'ab-wheel': [
    'À genoux, déroule en gardant le bassin en rétroversion.',
    'Ne cambre jamais : l’amplitude s’arrête avant que les lombaires creusent.',
  ],
  'hollow-hold': [
    'Bas du dos collé au sol, jambes et épaules décollées.',
    'Position creuset maintenue : ne laisse pas les lombaires se décoller.',
  ],
  'mountain-climbers': [
    'Position de planche, alterne les genoux vers la poitrine.',
    'Bassin stable, rythme soutenu.',
  ],
  'farmer-carry': [
    'Charges lourdes dans chaque main, épaules basses et en arrière.',
    'Marche droit, gainage serré, respiration contrôlée.',
  ],
  'landmine-rotation': [
    'Bras tendus, rotation qui part du tronc et des hanches.',
    'Contrôle la fin de course : pas de mouvement balistique.',
  ],

  // —— Cardio ——
  'treadmill-run': [
    'Échauffe-toi 5 minutes en marche progressive.',
    'Foulée souple, buste droit, regard loin devant.',
    'Ne t’accroche pas aux barres pendant l’effort.',
  ],
  'treadmill-incline': [
    'Inclinaison 8–15 % à allure de marche rapide.',
    'Excellent pour le cardio avec peu d’impact articulaire.',
  ],
  'bike-upright': [
    'Selle réglée pour que la jambe soit presque tendue en bas.',
    'Pédalage fluide, 70–90 tours par minute.',
  ],
  'bike-recumbent': [
    'Dos soutenu, aucun travail du haut du corps.',
    'Idéal en reprise ou en cas de douleurs lombaires.',
  ],
  elliptical: [
    'Mouvement fluide sans impact, haut et bas du corps engagés.',
    'Garde le buste droit, pousse et tire avec les poignées.',
  ],
  rower: [
    'Ordre : jambes, puis buste, puis bras. Retour dans l’ordre inverse.',
    'Dos plat, la puissance vient des jambes, pas des bras.',
    'Environ 20–26 coups par minute en endurance.',
  ],
  'rower-intervals': [
    'Alterne efforts intenses et récupérations actives.',
    'Garde la même technique quand la fatigue arrive.',
  ],
  stairmaster: [
    'Pose le pied entier sur la marche, buste droit.',
    'Ne t’appuie pas de tout ton poids sur les poignées.',
  ],
  spinning: [
    'Alterne positions assise et danseuse selon la résistance.',
    'Garde le buste stable, sans balancement excessif.',
  ],
  'jump-rope': [
    'Sauts bas et rapides, impulsion des chevilles.',
    'Coudes proches du corps, la corde tourne avec les poignets.',
  ],
  'sled-push': [
    'Buste incliné, bras tendus, poussée continue par les jambes.',
    'Petits pas puissants, pas de course.',
  ],
  'sled-pull': [
    'Tire en reculant ou en marchant, chaîne postérieure engagée.',
    'Garde une tension constante sur la sangle.',
  ],
  'battle-ropes': [
    'Position semi-fléchie, gainage serré.',
    'Vagues alternées ou simultanées, effort court et intense.',
  ],
};

export function getGuide(exerciseId: string): string[] {
  return EXERCISE_GUIDES[exerciseId] ?? [];
}
