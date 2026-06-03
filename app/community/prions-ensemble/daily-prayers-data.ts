import { getParisDayIndex } from "@/app/devotion/devotions-data";

/**
 * PRIONS ENSEMBLE — Prière du jour structurée (Centre Chrétien Berakah).
 *
 * Structure officielle CCB : intro, verset (LSG), 3 exhortations,
 * 5 points de prière, prière guidée, 6 déclarations prophétiques, clôture.
 *
 * Planification hebdomadaire (thème par jour) :
 *   Lundi=Consécration · Mardi=Adoration · Mercredi=Famille ·
 *   Jeudi=Ma Nation · Vendredi=Prophétique · Samedi=Carrière & Finances ·
 *   Dimanche=Église
 */
export interface DailyPrayer {
  id: string | null;
  date?: string;
  dayLabel: string;        // "Lundi"
  theme: string;           // "CONSÉCRATION"
  verse_ref: string;
  verse_text: string;
  intro: string;
  exhortation: string[];   // 3 paragraphes
  prayerPoints: string[];  // 5 points
  guidedPrayer: string;    // 150–250 mots
  declarations: string[];  // 6 déclarations
  author: string;
}

const AUTHOR = "Révérend Elvis NGUIFFO — Centre Chrétien Berakah";

// Ordre IMPÉRATIF : index = getParisDayIndex() (0=Dimanche … 6=Samedi)
export const STATIC_PRAYERS: DailyPrayer[] = [
  // ───────────────────────── [0] DIMANCHE — ÉGLISE ─────────────────────────
  {
    id: null,
    dayLabel: "Dimanche",
    theme: "ÉGLISE",
    verse_ref: "Matthieu 16:18",
    verse_text: "Et moi, je te dis que tu es Pierre, et que sur cette pierre je bâtirai mon Église, et que les portes du séjour des morts ne prévaudront point contre elle.",
    intro: "Aujourd’hui dans PRIONS ENSEMBLE, nous allons prier pour l’Église, le Corps de Christ. Nous voulons intercéder pour son réveil, pour ses pasteurs, pour ses ministères et pour l’avancement de l’Évangile dans toute la terre.",
    exhortation: [
      "L’Église n’est pas un bâtiment, mais le Corps vivant de Jésus-Christ sur la terre. Elle est l’épouse pour laquelle il a donné sa vie, le rassemblement des rachetés appelés à porter sa lumière. Lorsque Jésus déclare qu’il bâtira son Église, il prend lui-même la responsabilité de la faire grandir. Notre rôle n’est pas de la porter par nos forces, mais de nous laisser édifier par lui. Comprends aujourd’hui que tu fais partie de quelque chose de plus grand que toi : une famille spirituelle que rien ne peut détruire.",
      "Le Seigneur a promis que les portes du séjour des morts ne prévaudront point contre son Église. Cela signifie que malgré les attaques, les divisions et les épreuves, l’Église demeure debout. Mais une promesse n’annule pas la prière, elle l’appelle. Plus l’Église est précieuse aux yeux de Dieu, plus elle a besoin d’intercesseurs qui se tiennent dans la brèche. Aujourd’hui, place-toi comme une sentinelle pour la maison de Dieu, pour tes responsables spirituels et pour l’unité des frères.",
      "Une Église en bonne santé transforme une ville, une nation, une génération. Quand le peuple de Dieu prie, s’aime et annonce l’Évangile, les âmes sont sauvées et les vies sont changées. Le Centre Chrétien Berakah a reçu la vision de former des disciples, de transformer des vies et de manifester la bénédiction. Cette vision avance par la prière. Avant de présenter nos requêtes, rappelle-toi que tu n’intercèdes pas seul : tu te joins à des millions de croyants qui, partout, élèvent la voix pour l’Église du Seigneur.",
    ],
    prayerPoints: [
      "Pour le réveil spirituel dans l’Église et l’effusion fraîche du Saint-Esprit.",
      "Pour la protection, la santé et l’onction des pasteurs et des serviteurs de Dieu.",
      "Pour l’unité, l’amour fraternel et la fin de toute division dans le Corps de Christ.",
      "Pour l’avancement de l’Évangile, l’évangélisation et le salut des âmes.",
      "Pour l’affermissement des nouveaux convertis et la formation de vrais disciples.",
    ],
    guidedPrayer: "Prions ensemble. Seigneur Jésus, tu es la tête de l’Église et nous sommes ton Corps. Nous te remercions de nous avoir appelés dans ta famille. Aujourd’hui, nous intercédons pour ton Église partout sur la terre. Visite-la par ton Esprit, réveille les cœurs endormis et rallume la flamme de la première dévotion. Fortifie tes serviteurs ; donne-leur sagesse, courage et intégrité pour conduire ton peuple. Couvre-les de ta protection, eux et leurs familles. Nous te prions pour l’unité du Corps : que toute division, jalousie et compétition disparaissent, et que l’amour règne entre les frères. Donne à ton Église la passion des âmes ; ouvre des portes pour l’Évangile, et que des multitudes viennent à toi. Affermis les nouveaux convertis, garde-les de l’ennemi et fais d’eux de véritables disciples. Bénis le Centre Chrétien Berakah ; accomplis ta vision de former, de transformer et de bénir. Que ta gloire remplisse ta maison comme les eaux couvrent le fond de la mer. Au nom puissant de Jésus, amen.",
    declarations: [
      "Je déclare que l’Église de Jésus-Christ est debout et que rien ne prévaudra contre elle.",
      "Je déclare que le réveil descend sur la maison de Dieu et que les cœurs sont embrasés.",
      "Je déclare que nos pasteurs sont protégés, fortifiés et oints d’une onction fraîche.",
      "Je déclare l’unité et l’amour fraternel dans le Corps de Christ.",
      "Je déclare que des âmes sont sauvées et ajoutées à l’Église chaque jour.",
      "Je déclare que la vision du Centre Chrétien Berakah s’accomplit avec puissance.",
    ],
    author: AUTHOR,
  },

  // ──────────────────────── [1] LUNDI — CONSÉCRATION ────────────────────────
  {
    id: null,
    dayLabel: "Lundi",
    theme: "CONSÉCRATION",
    verse_ref: "Romains 12:1",
    verse_text: "Je vous exhorte donc, frères, par les compassions de Dieu, à offrir vos corps comme un sacrifice vivant, saint, agréable à Dieu, ce qui sera de votre part un culte raisonnable.",
    intro: "Aujourd’hui dans PRIONS ENSEMBLE, nous allons prier pour notre consécration. Nous voulons nous remettre entièrement entre les mains de Dieu, rechercher la sainteté, renouveler notre vie de prière et grandir dans une intimité profonde avec le Saint-Esprit.",
    exhortation: [
      "La consécration, c’est le choix quotidien de t’appartenir à Dieu sans réserve. L’apôtre Paul nous invite à offrir nos corps comme un sacrifice vivant. Un sacrifice vivant peut descendre de l’autel, c’est pourquoi la consécration n’est pas un événement unique mais une décision renouvelée chaque matin. Aujourd’hui, tu choisis de nouveau de placer ta volonté, tes désirs et tes projets sous la seigneurie de Jésus. Ce n’est pas une contrainte, mais le plus raisonnable des cultes, la réponse logique à l’amour immense de Dieu pour toi.",
      "La sainteté n’est pas une liste de règles, c’est une relation. Plus tu t’approches de Dieu, plus sa lumière révèle ce qui doit changer en toi. La repentance n’est pas une condamnation, c’est une porte ouverte vers la liberté. Ne fuis pas la présence de Dieu à cause de tes faiblesses ; cours vers elle, car c’est là que tu es transformé. Le Saint-Esprit veut te sanctifier de gloire en gloire, jusqu’à ce que le caractère de Christ se forme en toi. Laisse-le travailler dans les profondeurs de ton cœur.",
      "L’intimité avec Dieu se construit dans le secret de la prière. C’est dans ces moments cachés que ta foi se fortifie et que ta vie porte du fruit. Beaucoup recherchent la puissance, mais la puissance jaillit de la présence. Avant de demander quoi que ce soit, désire d’abord celui qui donne. Aujourd’hui, prends la décision de cultiver une vie de prière régulière, une écoute attentive de l’Esprit et une obéissance joyeuse. Ainsi, ta consécration deviendra le fondement solide sur lequel Dieu bâtira de grandes choses.",
    ],
    prayerPoints: [
      "Pour une consécration totale de notre vie, notre temps et nos projets à Dieu.",
      "Pour un cœur repentant et une vie de sainteté qui plaît au Seigneur.",
      "Pour le réveil de notre vie de prière et de notre communion avec Dieu.",
      "Pour être remplis et conduits par le Saint-Esprit chaque jour.",
      "Pour la grâce d’obéir promptement à la voix de Dieu.",
    ],
    guidedPrayer: "Prions ensemble. Père céleste, par tes compassions, je me présente devant toi. J’offre ma vie comme un sacrifice vivant, saint et agréable à tes yeux. Je te remets mon corps, mon âme et mon esprit ; sois le Seigneur de chaque domaine de mon existence. Pardonne-moi tout péché, toute négligence et toute idole cachée dans mon cœur. Lave-moi par le sang précieux de Jésus et purifie-moi de toute souillure. Saint-Esprit, viens habiter pleinement en moi ; sanctifie-moi de gloire en gloire et forme en moi le caractère de Christ. Allume en moi une faim profonde de ta présence. Réveille ma vie de prière, apprends-moi à demeurer en toi et à écouter ta voix. Donne-moi un cœur obéissant qui te suit sans hésiter. Que ma vie tout entière devienne un culte qui te glorifie. Garde-moi consacré aujourd’hui et tous les jours, jusqu’à ce que je ressemble pleinement à ton Fils bien-aimé. Au nom puissant de Jésus, amen.",
    declarations: [
      "Je déclare que ma vie appartient entièrement à Dieu et que je suis un sacrifice vivant.",
      "Je déclare que je marche dans la sainteté et que le péché n’a plus de domination sur moi.",
      "Je déclare que ma vie de prière est réveillée et que je demeure dans la présence de Dieu.",
      "Je déclare que je suis rempli et conduit par le Saint-Esprit.",
      "Je déclare que j’obéis promptement à la voix du Seigneur.",
      "Je déclare que le caractère de Christ se forme en moi chaque jour.",
    ],
    author: AUTHOR,
  },

  // ───────────────────────── [2] MARDI — ADORATION ─────────────────────────
  {
    id: null,
    dayLabel: "Mardi",
    theme: "ADORATION",
    verse_ref: "Jean 4:23",
    verse_text: "Mais l’heure vient, et elle est déjà venue, où les vrais adorateurs adoreront le Père en esprit et en vérité ; car ce sont là les adorateurs que le Père demande.",
    intro: "Aujourd’hui dans PRIONS ENSEMBLE, nous allons prier dans l’adoration. Nous voulons élever notre louange, entrer dans la présence de Dieu, lui rendre grâce et lui exprimer notre amour, car il en est digne.",
    exhortation: [
      "L’adoration est la réponse du cœur à la grandeur de Dieu. Avant d’être une chanson, elle est une attitude : reconnaître qui est Dieu et lui rendre ce qui lui revient. Le Père recherche des adorateurs en esprit et en vérité, c’est-à-dire des cœurs sincères qui l’honorent au-delà des lèvres. Quand tu adores, tu détournes le regard de tes problèmes pour le fixer sur celui qui est plus grand que tout. L’adoration ne change pas seulement l’atmosphère autour de toi ; elle transforme ton cœur et renouvelle ta perspective.",
      "La louange ouvre les portes de la présence de Dieu. Le psalmiste nous enseigne à entrer dans ses parvis avec des actions de grâces. La reconnaissance n’est pas une formalité, c’est une arme spirituelle qui chasse le découragement et fait grandir la foi. Lorsque tu commences à compter les bienfaits du Seigneur, tu réalises combien sa fidélité est grande. Même dans l’épreuve, choisis de l’adorer, car l’adoration affirme ta confiance en lui avant même de voir la réponse. Le sacrifice de louange est précieux aux yeux de Dieu.",
      "Adorer Dieu, c’est aussi l’aimer pour ce qu’il est, et non seulement pour ce qu’il fait. Beaucoup s’approchent de Dieu uniquement pour ses dons ; mais l’adorateur véritable désire d’abord le Donateur. Aujourd’hui, laisse ton cœur déborder d’amour pour ton Père céleste. Prends le temps de le contempler, de méditer sa bonté, sa sainteté et sa miséricorde. Plus tu l’adores, plus tu lui ressembles, car nous devenons semblables à ce que nous contemplons. Que ta vie tout entière devienne un parfum d’adoration qui monte vers le trône de Dieu.",
    ],
    prayerPoints: [
      "Pour entrer dans une adoration sincère, en esprit et en vérité.",
      "Pour un cœur rempli de reconnaissance et d’actions de grâces.",
      "Pour une révélation plus profonde de la grandeur et de la sainteté de Dieu.",
      "Pour que l’amour de Dieu déborde dans nos cœurs.",
      "Pour que notre vie tout entière devienne un acte d’adoration.",
    ],
    guidedPrayer: "Prions ensemble. Père céleste, nous nous prosternons devant toi, car tu es digne de toute louange. Tu es saint, tu es bon, tu es fidèle, et ta miséricorde dure à toujours. Nous t’adorons en esprit et en vérité, non du bout des lèvres, mais du fond du cœur. Merci pour le don de la vie, merci pour ton salut, merci pour ton amour qui ne change jamais. Nous entrons dans tes parvis avec des actions de grâces et nous bénissons ton saint nom. Pardonne-nous chaque fois que nous t’avons cherché pour tes dons plutôt que pour toi-même. Aujourd’hui, nous désirons ta présence plus que toute chose. Remplis nos cœurs de ton amour, embrase notre adoration et renouvelle notre première dévotion. Que nos louanges montent comme un parfum agréable devant ton trône. Sois exalté dans nos vies, dans nos familles et dans ton Église. Règne en nous, Seigneur, aujourd’hui et pour toujours. Au nom puissant de Jésus, amen.",
    declarations: [
      "Je déclare que je suis un vrai adorateur qui honore Dieu en esprit et en vérité.",
      "Je déclare que ma louange ouvre les portes de la présence de Dieu.",
      "Je déclare que mon cœur déborde de reconnaissance et d’actions de grâces.",
      "Je déclare que je contemple la grandeur de Dieu et que je suis transformé.",
      "Je déclare que l’amour de Dieu remplit et inonde mon cœur.",
      "Je déclare que ma vie tout entière est un acte d’adoration pour sa gloire.",
    ],
    author: AUTHOR,
  },

  // ───────────────────────── [3] MERCREDI — FAMILLE ─────────────────────────
  {
    id: null,
    dayLabel: "Mercredi",
    theme: "FAMILLE",
    verse_ref: "Josué 24:15",
    verse_text: "Choisissez aujourd’hui qui vous voulez servir... Moi et ma maison, nous servirons l’Éternel.",
    intro: "Aujourd’hui dans PRIONS ENSEMBLE, nous allons prier pour nos familles. Nous voulons intercéder pour la protection de nos foyers, pour les mariages, pour les enfants, pour le salut de nos proches et pour l’unité familiale.",
    exhortation: [
      "La famille est la première institution établie par Dieu, et l’ennemi le sait bien. C’est pourquoi tant de foyers sont attaqués par la division, l’incompréhension et la souffrance. Mais Dieu a un plan pour ta maison : un plan de paix, d’amour et de bénédiction. Comme Josué, tu peux te tenir devant le Seigneur et déclarer un choix pour toute ta famille : moi et ma maison, nous servirons l’Éternel. Ta prière a le pouvoir de couvrir ton foyer et de poser un fondement spirituel solide pour les générations à venir.",
      "Le mariage et les relations familiales s’édifient sur l’amour, le pardon et la patience. Aucune famille n’est parfaite, mais toute famille peut être restaurée par la grâce de Dieu. Là où il y a des blessures, le Seigneur veut apporter la guérison ; là où il y a des murs, il veut bâtir des ponts. Ne laisse pas l’amertume détruire ce que Dieu veut bénir. Choisis aujourd’hui de pardonner, d’aimer et de prier pour les tiens. La prière persévérante d’un seul membre peut transformer l’atmosphère de toute une maison.",
      "Nos enfants sont un héritage de l’Éternel, et nos proches sont précieux à ses yeux. Beaucoup de nos bien-aimés ne connaissent pas encore le Seigneur, mais aucune situation n’est trop difficile pour Dieu. Le salut de nos familles est sa volonté. Continue d’intercéder avec foi, car la promesse t’est faite, à toi et à ta maison. Confie tes enfants à Dieu, couvre-les de prière, et crois pour leur protection, leur éducation et leur destinée. Une famille qui prie ensemble demeure unie, et une famille qui sert Dieu marche dans la bénédiction.",
    ],
    prayerPoints: [
      "Pour la protection divine sur chaque membre de nos familles.",
      "Pour la paix, l’amour et la restauration dans les mariages et les foyers.",
      "Pour la protection, l’éducation et la destinée de nos enfants.",
      "Pour le salut de nos proches qui ne connaissent pas encore le Seigneur.",
      "Pour l’unité familiale et le service de Dieu dans nos maisons.",
    ],
    guidedPrayer: "Prions ensemble. Père céleste, nous te confions nos familles en ce jour. Étends ta main de protection sur chaque membre de nos foyers ; couvre-les du sang précieux de Jésus et garde-les de tout mal, de tout accident et de toute attaque de l’ennemi. Nous te prions pour nos mariages : que l’amour, le respect et le pardon y règnent. Restaure ce qui est brisé, réconcilie ce qui est divisé et fais de nos foyers des lieux de paix. Seigneur, nous te confions nos enfants ; protège-les, conduis-les dans tes voies et accomplis en eux ta destinée. Garde-les des mauvaises compagnies et fais d’eux des disciples qui te servent. Nous intercédons pour nos proches qui ne te connaissent pas encore : ouvre leurs cœurs, attire-les à toi et accorde-leur le salut. Que nos maisons soient remplies de ta présence et que, comme Josué, nous déclarions : moi et ma maison, nous servirons l’Éternel. Au nom puissant de Jésus, amen.",
    declarations: [
      "Je déclare que ma famille est protégée et couverte par le sang de Jésus.",
      "Je déclare que la paix et l’amour règnent dans mon foyer et dans mon mariage.",
      "Je déclare que mes enfants sont un héritage de l’Éternel et marchent dans sa destinée.",
      "Je déclare le salut de mes proches qui ne connaissent pas encore le Seigneur.",
      "Je déclare que mon foyer est uni et qu’il sert l’Éternel.",
      "Je déclare que la bénédiction de Dieu repose sur ma maison.",
    ],
    author: AUTHOR,
  },

  // ───────────────────────── [4] JEUDI — MA NATION ─────────────────────────
  {
    id: null,
    dayLabel: "Jeudi",
    theme: "MA NATION",
    verse_ref: "1 Timothée 2:1-2",
    verse_text: "J’exhorte donc, avant toutes choses, à faire des prières, des supplications, des requêtes, des actions de grâces, pour tous les hommes, pour les rois et pour tous ceux qui sont élevés en dignité, afin que nous menions une vie paisible et tranquille.",
    intro: "Aujourd’hui dans PRIONS ENSEMBLE, nous allons prier pour notre nation. Nous voulons intercéder pour les dirigeants, pour la paix, pour la justice, pour un réveil spirituel et pour la protection de notre pays.",
    exhortation: [
      "Dieu nous appelle à intercéder pour notre nation. L’apôtre Paul exhorte à prier avant toutes choses pour les rois et pour tous ceux qui sont élevés en dignité. La prière du peuple de Dieu a une influence réelle sur la destinée d’un pays. Lorsque nous prions pour nos dirigeants, nous demandons à Dieu de leur accorder la sagesse, l’intégrité et la crainte de l’Éternel. Une nation gouvernée dans la justice connaît la paix. Ne sous-estime jamais le poids de ta prière : elle peut changer le cours de l’histoire de ton pays.",
      "Le Seigneur a promis que si son peuple s’humilie, prie et se détourne de ses mauvaises voies, il guérira son pays. La guérison d’une nation commence dans le cœur des croyants. Avant de pointer du doigt les problèmes, nous nous présentons devant Dieu avec humilité et repentance. Là où il y a corruption, nous demandons la justice ; là où il y a violence, nous demandons la paix ; là où il y a ténèbres, nous demandons la lumière. Notre nation a besoin d’un réveil spirituel qui ramène les cœurs vers Dieu.",
      "Recherchez le bien de la ville où Dieu vous a placés, car dans sa prospérité se trouve la vôtre. Nous ne sommes pas des spectateurs, mais des sentinelles qui veillent sur le pays par la prière. Demandons à Dieu de protéger notre nation de tout mal, de toute calamité et de tout plan de destruction. Prions pour la stabilité, le développement et la prospérité. Mais surtout, prions pour que l’Évangile se répande, que les âmes soient sauvées et que la gloire de Dieu remplisse notre terre. Une nation qui revient à Dieu marche vers un avenir d’espérance.",
    ],
    prayerPoints: [
      "Pour les dirigeants : sagesse, intégrité et crainte de Dieu dans le gouvernement.",
      "Pour la paix, la stabilité et la fin de toute violence dans notre nation.",
      "Pour la justice et la fin de la corruption à tous les niveaux.",
      "Pour un réveil spirituel et le salut de multitudes d’âmes.",
      "Pour la protection divine du pays contre tout plan de destruction.",
    ],
    guidedPrayer: "Prions ensemble. Père céleste, nous nous présentons devant toi pour intercéder en faveur de notre nation. Nous te prions pour nos dirigeants : accorde-leur la sagesse, l’intégrité et la crainte de l’Éternel afin qu’ils gouvernent avec justice. Que ta main dirige les décisions qui concernent l’avenir de notre pays. Seigneur, nous te demandons la paix dans nos villes et nos villages ; fais cesser la violence et établis la tranquillité. Là où règne la corruption, fais lever la justice ; là où règnent les ténèbres, fais briller ta lumière. Nous nous humilions devant toi selon ta promesse : pardonne les péchés de notre nation et guéris notre pays. Envoie un réveil spirituel puissant ; que des multitudes reviennent à toi et soient sauvées. Protège notre terre de toute calamité, de toute épidémie et de tout plan de destruction. Bénis notre nation, accorde-lui prospérité et stabilité, et que ta gloire la remplisse. Que ton règne vienne et que ta volonté soit faite chez nous comme au ciel. Au nom puissant de Jésus, amen.",
    declarations: [
      "Je déclare que nos dirigeants sont conduits par la sagesse et la crainte de Dieu.",
      "Je déclare la paix et la stabilité sur notre nation.",
      "Je déclare que la justice s’élève et que la corruption est démasquée.",
      "Je déclare qu’un réveil spirituel embrase notre pays et que des âmes sont sauvées.",
      "Je déclare la protection divine sur notre nation contre tout mal.",
      "Je déclare que notre pays revient à Dieu et marche vers un avenir d’espérance.",
    ],
    author: AUTHOR,
  },

  // ──────────────────────── [5] VENDREDI — PROPHÉTIQUE ────────────────────────
  {
    id: null,
    dayLabel: "Vendredi",
    theme: "PROPHÉTIQUE",
    verse_ref: "Job 22:28",
    verse_text: "À tes résolutions répondra le succès ; sur tes sentiers brillera la lumière.",
    intro: "Aujourd’hui dans PRIONS ENSEMBLE, nous allons prier dans la dimension prophétique. Nous voulons déclarer la Parole avec foi, saisir notre destinée, nous approprier les promesses de Dieu, marcher dans la victoire et expérimenter la percée spirituelle.",
    exhortation: [
      "Il y a une puissance dans la parole déclarée avec foi. Job nous enseigne qu’à nos résolutions répondra le succès, et que sur nos sentiers brillera la lumière. Ce que tu décrètes selon la Parole de Dieu produit un effet dans le monde spirituel. Tes paroles ne sont pas vides ; elles bâtissent ou détruisent, elles libèrent ou retiennent. Aujourd’hui, choisis de déclarer la vie, la bénédiction et la promesse de Dieu sur ta situation. Cesse de répéter tes craintes et commence à proclamer ta destinée selon ce que Dieu a dit de toi.",
      "Le Seigneur t’a créé pour un dessein glorieux. Avant même ta naissance, il avait écrit dans son livre tous les jours qui t’étaient destinés. L’ennemi cherche à détourner ta destinée, mais aucune arme forgée contre toi ne prospérera. Saisis par la foi ce que Dieu a préparé pour toi. Comme Ézéchiel devant les ossements desséchés, prophétise sur ce qui semble mort dans ta vie, et tu verras la résurrection. Ta destinée n’est pas déterminée par tes circonstances actuelles, mais par les promesses de celui qui ne ment jamais.",
      "La foi déplace les montagnes. Jésus a déclaré que celui qui dira à la montagne d’être ôtée et jetée dans la mer, sans douter dans son cœur, verra s’accomplir ce qu’il a dit. La percée appartient à ceux qui persévèrent dans la prière et qui refusent d’abandonner. Aujourd’hui, lève-toi avec audace ; brise toute limitation, tout retard et tout blocage au nom de Jésus. Marche dans la victoire que Christ a déjà acquise pour toi à la croix. Ce vendredi, décrète ta percée, et que la lumière brille sur tous tes sentiers.",
    ],
    prayerPoints: [
      "Pour déclarer avec foi la Parole de Dieu sur notre vie et nos situations.",
      "Pour saisir et accomplir pleinement notre destinée en Christ.",
      "Pour la percée spirituelle, financière, professionnelle et relationnelle.",
      "Pour briser tout retard, toute limitation et tout blocage.",
      "Pour marcher dans la victoire totale acquise par Jésus à la croix.",
    ],
    guidedPrayer: "Prions ensemble. Père céleste, nous venons devant toi avec foi et audace. Ta Parole déclare qu’à nos résolutions répondra le succès et que sur nos sentiers brillera la lumière. Nous saisissons aujourd’hui tes promesses et nous les déclarons sur nos vies. Nous prophétisons la vie là où il semblait y avoir la mort, la croissance là où il y avait la stagnation, et la percée là où il y avait le blocage. Seigneur, accomplis en nous la destinée que tu as écrite avant la fondation du monde. Que toute arme forgée contre nous soit sans effet, et que tout plan de l’ennemi soit annulé. Nous brisons au nom de Jésus tout retard, toute limitation et tout cycle d’échec. Nous décrétons l’ouverture des portes fermées et la libération de ce qui était retenu. Donne-nous la foi qui déplace les montagnes et la persévérance qui obtient la réponse. Nous marchons dans la victoire que Christ a remportée à la croix. Que ta lumière brille sur tous nos sentiers, aujourd’hui et toujours. Au nom puissant de Jésus, amen.",
    declarations: [
      "Je déclare qu’à mes résolutions répond le succès et que la lumière brille sur mes sentiers.",
      "Je déclare que j’accomplis pleinement la destinée que Dieu a écrite pour moi.",
      "Je déclare que toute arme forgée contre moi est sans effet.",
      "Je déclare la percée dans tous les domaines de ma vie.",
      "Je déclare que tout retard, toute limitation et tout blocage sont brisés au nom de Jésus.",
      "Je déclare que je marche dans la victoire totale de Christ.",
    ],
    author: AUTHOR,
  },

  // ───────────────── [6] SAMEDI — CARRIÈRE ET FINANCES ─────────────────
  {
    id: null,
    dayLabel: "Samedi",
    theme: "CARRIÈRE ET FINANCES",
    verse_ref: "Deutéronome 8:18",
    verse_text: "Souviens-toi de l’Éternel, ton Dieu, car c’est lui qui te donnera de la force pour les acquérir, afin de confirmer, comme il le fait aujourd’hui, son alliance qu’il a jurée à tes pères.",
    intro: "Aujourd’hui dans PRIONS ENSEMBLE, nous allons prier pour notre carrière et nos finances. Nous voulons intercéder pour le travail, l’entrepreneuriat, l’emploi, les études, la provision divine et une saine gestion de nos ressources.",
    exhortation: [
      "C’est Dieu qui donne la force de produire des richesses. Cette vérité libère le croyant de l’angoisse et de la cupidité. Tes capacités, tes opportunités et tes réussites viennent de lui. Travailler n’est pas une malédiction mais une vocation noble par laquelle Dieu pourvoit à tes besoins et te rend utile aux autres. Aujourd’hui, remets ton travail, tes projets et tes études entre les mains du Seigneur. Reconnais-le comme la source de ta provision et il bénira l’œuvre de tes mains au-delà de ce que tu peux imaginer.",
      "Le Seigneur veut que tu prospères et que tu réussisses ce que tu entreprends. Mais la véritable prospérité se construit sur la sagesse, l’intégrité et le travail bien fait. Recommande tes œuvres à l’Éternel, et tes projets réussiront. La provision divine n’encourage pas la paresse, elle accompagne la diligence. Demande à Dieu des idées, des stratégies et des portes ouvertes. Là où les voies humaines sont fermées, lui peut ouvrir un chemin. Place ta confiance en lui plutôt que dans l’incertitude de l’économie, car il est un Père fidèle qui prend soin des siens.",
      "Mon Dieu pourvoira à tous vos besoins selon sa richesse, avec gloire, en Jésus-Christ. Cette promesse est ton assurance contre la peur du manque. La bonne gestion fait partie de la bénédiction : apprends à gérer avec sagesse ce que Dieu te confie, à épargner, à donner et à honorer Dieu de tes prémices. Celui qui est fidèle dans les petites choses reçoit la responsabilité des grandes. Aujourd’hui, confie au Seigneur ta carrière et tes finances, et crois pour une provision abondante, une élévation et une stabilité durable. Dieu prend plaisir à la prospérité de ses serviteurs.",
    ],
    prayerPoints: [
      "Pour la bénédiction et la réussite dans notre travail et nos entreprises.",
      "Pour des portes d’emploi, de contrats et d’opportunités favorables.",
      "Pour la réussite dans les études et l’excellence dans la formation.",
      "Pour la provision divine et la fin de toute situation de manque.",
      "Pour la sagesse dans la gestion de nos finances et une saine prospérité.",
    ],
    guidedPrayer: "Prions ensemble. Père céleste, nous te reconnaissons comme la source de toute provision. C’est toi qui donnes la force d’acquérir des richesses, et nous remettons entre tes mains notre carrière et nos finances. Bénis l’œuvre de nos mains ; que nos efforts portent du fruit et que nos projets réussissent. Ouvre pour nous des portes d’emploi, de contrats et d’opportunités que nul ne pourra fermer. Donne-nous des idées, des stratégies et la sagesse pour exceller dans notre travail et nos entreprises. Nous te confions ceux qui étudient : accorde-leur l’intelligence, la concentration et l’excellence. Seigneur, fais cesser toute situation de manque ; pourvois à tous nos besoins selon ta richesse, avec gloire, en Jésus-Christ. Apprends-nous à gérer avec sagesse ce que tu nous confies, à épargner, à donner et à t’honorer de nos prémices. Élève-nous, établis-nous et accorde-nous une prospérité durable qui te glorifie et qui bénit les autres. Garde-nous de la cupidité et de l’orgueil, et que nous restions de fidèles intendants. Au nom puissant de Jésus, amen.",
    declarations: [
      "Je déclare que c’est Dieu qui me donne la force de produire des richesses.",
      "Je déclare que l’œuvre de mes mains est bénie et que mes projets réussissent.",
      "Je déclare que des portes d’emploi et d’opportunités s’ouvrent devant moi.",
      "Je déclare l’excellence et la réussite dans mes études et ma formation.",
      "Je déclare que mon Dieu pourvoit à tous mes besoins selon sa richesse, avec gloire.",
      "Je déclare que je gère mes finances avec sagesse et que je marche dans la prospérité de Dieu.",
    ],
    author: AUTHOR,
  },
];

/** Prière du jour (rotation par jour de la semaine en fuseau Europe/Paris). */
export function getDailyPrayer(): DailyPrayer {
  const dayIndex = getParisDayIndex(); // 0=Dimanche … 6=Samedi
  return STATIC_PRAYERS[dayIndex];
}

/**
 * Aplatit la prière structurée en un script texte unique (pour stockage DB,
 * partage et lecture façon HeyGen). Respecte la structure officielle CCB.
 */
export function buildPrayerContent(p: DailyPrayer): string {
  const lines: string[] = [];
  lines.push(`🔥 PRIONS ENSEMBLE — ${p.dayLabel.toUpperCase()} : ${p.theme}`);
  lines.push("");
  lines.push(p.intro);
  lines.push("");
  lines.push(p.verse_ref);
  lines.push(`« ${p.verse_text} »`);
  lines.push("");
  p.exhortation.forEach((e) => { lines.push(e); lines.push(""); });
  lines.push("Voici maintenant nos points de prière :");
  p.prayerPoints.forEach((pt) => lines.push(`- ${pt}`));
  lines.push("");
  lines.push(p.guidedPrayer);
  lines.push("");
  lines.push("Déclarons maintenant avec foi :");
  p.declarations.forEach((d) => lines.push(d));
  lines.push("");
  lines.push("Que le Seigneur vous bénisse abondamment.");
  lines.push("");
  lines.push(p.author);
  return lines.join("\n");
}
