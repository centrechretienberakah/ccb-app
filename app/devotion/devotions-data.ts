export interface Devotion {
  id: string | null;
  date?: string;
  title: string;
  verse_ref: string;
  verse_text: string;
  content: string;
  application: string;
  prayer: string;
  declaration: string;
  author: string;
}

// 7 devotions de reference (tournent selon le jour de la semaine)
export const STATIC_DEVOTIONS: Devotion[] = [
  {
    id: null,
    title: "Marcher dans la foi",
    verse_ref: "Hebreux 11:1",
    verse_text: "Or la foi est une ferme assurance des choses qu'on espere, une demonstration de celles qu'on ne voit pas.",
    content: `La foi est le fondement invisible de tout ce que nous esperons. Elle n'est pas un sentiment fragile qui vacille au moindre vent contraire — c'est une conviction ancrée dans le caractere immuable de Dieu.\n\nAbraham quitta son pays sans savoir ou il allait. Moise traversa la mer Rouge sans voir le chemin. Marie accepta l'impossible. Chacun d'eux marcha par la foi, non par la vue.\n\nAujourd'hui, vos circonstances racontent peut-etre une histoire differente de ce que Dieu vous a promis. C'est dans cet ecart que la foi prend tout son sens : elle choisit de croire la Parole de Dieu plutot que les faits visibles.`,
    application: "Identifiez une promesse de Dieu que vous avez du mal a croire. Ecrivez-la, affichez-la, et declarez-la a voix haute trois fois aujourd'hui.",
    prayer: "Pere celeste, je te confie mes doutes et mes peurs. Augmente ma foi la ou elle est faible. Apprends-moi a m'appuyer sur Tes promesses plutot que sur mes propres forces. Que ma foi produise des actes concrets aujourd'hui. En nom de Jesus, Amen.",
    declaration: "Je marche par la foi et non par la vue. Les promesses de Dieu sont oui et amen dans ma vie !",
    author: "Pasteur Elvis",
  },
  {
    id: null,
    title: "La puissance de la priere",
    verse_ref: "Matthieu 7:7",
    verse_text: "Demandez, et l'on vous donnera ; cherchez, et vous trouverez ; frappez, et l'on vous ouvrira.",
    content: `Jesus ne dit pas « demandez si vous le meritez » ni « frappez si vous etes suffisamment saints ». Il dit simplement : demandez. Il y a dans cette invitation une confiance extraordinaire de Dieu envers Ses enfants.\n\nLa priere n'est pas une technique magique — c'est une relation. C'est le fils qui s'approche du Pere, le disciple qui s'assied aux pieds du Maitre. Et dans cette relation, le Dieu de l'univers se penche et ecoute.\n\nNe laissez jamais le sentiment d'indignite vous eloigner de la priere. C'est precisement dans notre fragilite que la grace de Dieu se manifeste avec le plus d'eclat.`,
    application: "Prenez 15 minutes aujourd'hui pour prier a voix haute. Formulez trois requetes precises. Datez-les dans un carnet pour celebrer les reponses.",
    prayer: "Seigneur, merci d'avoir ouvert la porte de Ta presence. Apprends-moi a perseverer dans la priere, a chercher Ta face et non seulement Ta main. Que ma vie de priere soit un temoignage vivant de Ta fidelite. En nom de Jesus, Amen.",
    declaration: "Je suis un enfant du Roi. Ma priere touche le coeur de Dieu et fait bouger les montagnes !",
    author: "Pasteur Elvis",
  },
  {
    id: null,
    title: "Renouveler son esprit",
    verse_ref: "Romains 12:2",
    verse_text: "Ne vous conformez pas au siecle present, mais soyez transformes par le renouvellement de l'intelligence.",
    content: `Notre culture nous bombarde de messages : soyez ceci, desirez cela, vaut z autant. Si nous ne filtrons pas activement ce que nous absorbons, notre esprit se moule imperceptiblement au monde.\n\nPaul nous appelle a une transformation radicale : le renouvellement de l'intelligence. Ce n'est pas un effort de volonte humaine — c'est un processus spirituel enclenche par la Parole de Dieu et l'Esprit Saint.\n\nChaque matin que vous passez dans la Parole est une session de deconditionnement. Chaque priere est un recalibrage. Chaque louange est un refus de laisser le monde definir votre identite.`,
    application: "Avant de consulter votre telephone ce matin, lisez un chapitre de la Bible. Laissez la Parole de Dieu etre la premiere voix que vous entendez.",
    prayer: "Esprit Saint, renouvelle mon intelligence aujourd'hui. La ou le monde a seme des mensonges, plante la verite de Ta Parole. Transforme ma facon de penser pour qu'elle ressemble de plus en plus a celle de Christ. Amen.",
    declaration: "Mon intelligence est renouvelee par la Parole de Dieu. Je reconnais et je refuse les mensonges du monde. Je pense comme Christ !",
    author: "Pasteur Elvis",
  },
  {
    id: null,
    title: "Perseverer dans l'epreuve",
    verse_ref: "Jacques 1:2-3",
    verse_text: "Mes freres, regardez comme un sujet de joie complete les diverses epreuves auxquelles vous pouvez etre exposes, sachant que l'epreuve de votre foi produit la patience.",
    content: `Comment peut-on regarder une epreuve avec joie ? C'est l'une des paradoxes les plus provocants de l'Ecriture. Jacques ne nous invite pas au masochisme spirituel — il nous revele une verite cachee : la souffrance porte en elle les graines de la croissance.\n\nL'or n'est pas detruit par le feu — il est purifie. De meme, les epreuves ne nous detruisent pas si nous nous appuyons sur Dieu ; elles eliminent les impuretes et revele l'or de notre foi.\n\nDieu ne vous a pas abandonne dans votre douleur. Il est au coeur de l'epreuve avec vous, sculptant en vous un caractere qui reflete Son Fils.`,
    application: "Nommez votre epreuve actuelle. Demandez a Dieu de vous montrer ce qu'Il veut produire a travers elle. Choisissez de lui faire confiance pour le processus.",
    prayer: "Pere, je ne comprends pas toujours Tes voies, mais je Te fais confiance. Utilise ce temps difficile pour me faconner. Donne-moi la grace de perseverer avec joie. Je sais que Tu tiens toutes choses en main. En nom de Jesus, Amen.",
    declaration: "Mes epreuves ne me definissent pas — elles me raffinent ! Je sors de chaque tempete plus fort, plus sage, plus confiant en Dieu.",
    author: "Pasteur Elvis",
  },
  {
    id: null,
    title: "Etre sel et lumiere",
    verse_ref: "Matthieu 5:14",
    verse_text: "Vous etes la lumiere du monde. Une ville situee sur une montagne ne peut etre cachee.",
    content: `Jesus ne dit pas « devenez la lumiere du monde si vous en faites assez ». Il declare ce que vous etes deja. L'identite precede la mission.\n\nUne lampe ne s'efforce pas de briller. Elle brille parce que c'est sa nature. De meme, lorsque vous vivez connecte a Christ — la Lumiere du monde — vous rayonnez naturellement.\n\nVotre temoignage n'est pas reserve aux grandes scenes ou aux grandes plateformes. Il se joue dans la facon dont vous traitez la caissiere, dont vous parlez de vos collegues, dont vous reagissez face a l'injustice.`,
    application: "Aujourd'hui, cherchez deliberement une occasion d'etre lumiere : un encouragement sincere, un acte de service inattendu, une parole de grace dans une conversation difficile.",
    prayer: "Seigneur, que Ta lumiere brille a travers moi aujourd'hui. Que les gens voient non pas moi, mais Toi a travers mes actes et mes paroles. Utilise-moi comme instrument de Ton amour dans la vie de ceux que je croiserai. Amen.",
    declaration: "Je suis lumiere dans ce monde ! La gloire de Dieu brille a travers ma vie et attire les hommes vers Lui.",
    author: "Pasteur Elvis",
  },
  {
    id: null,
    title: "L'amour qui depasse toute connaissance",
    verse_ref: "Jean 3:16",
    verse_text: "Car Dieu a tant aime le monde qu'il a donne son Fils unique, afin que quiconque croit en lui ne perisse point, mais qu'il ait la vie eternelle.",
    content: `« Tant aime » — deux mots qui contiennent l'infinite de Dieu. Non pas un amour conditionnel, transactionnel ou merite. Un amour qui a tout donne avant que nous demandions quoi que ce soit.\n\nDans un monde ou tout se merite et tout s'achete, l'amour de Dieu est une revolution. Il n'aime pas parce que vous etes bon — Il vous rend bon parce qu'Il vous aime.\n\nLaissez cet amour penetrer au-dela de votre theologie et toucher votre coeur aujourd'hui. Vous n'etes pas un projet a ameliorer pour Dieu — vous etes un fils, une fille, bien-aime(e).`,
    application: "Prenez cinq minutes pour recevoir l'amour de Dieu en silence. Pas de liste de requetes — juste vous, et Lui, et Ses mots : « Tu m'appartiens. Je t'aime. »",
    prayer: "Pere, merci pour un amour que je ne peux pas meriter et que rien ne peut oteir. Que cet amour soit ma fondation, ma securite, ma source. Libere-moi de tout besoin d'approbation humaine — Ta validation suffit. En nom de Jesus, Amen.",
    declaration: "Je suis aime(e) d'un amour eternel et inconditionnel. Rien ne peut me separer de l'amour de Dieu !",
    author: "Pasteur Elvis",
  },
  {
    id: null,
    title: "Chercher Sa presence en premier",
    verse_ref: "Matthieu 6:33",
    verse_text: "Cherchez premierement le royaume et la justice de Dieu ; et toutes ces choses vous seront donnees par-dessus.",
    content: `Nous vivons dans une culture de la priorite inversee : d'abord la carriere, ensuite Dieu si le temps le permet. D'abord l'argent, le confort, la reconnaissance — puis le reste.\n\nJesus renverse cette logique avec une promesse audacieuse : mettez Dieu en premier, et tout le reste sera ajoute. Ce n'est pas de la magie — c'est un principe de royaume.\n\nQuand Dieu est au centre, tout s'aligne autour de Lui : vos priorites deviennent justes, vos decisions claires, votre paix profonde. Vous cessez de courir apres ce que le Pere a deja prevu de donner a Ses enfants.`,
    application: "Avant de commencer votre journee de travail, consacrez les 10 premieres minutes a adorer Dieu — pas a demander, juste a Le chercher pour Lui-meme.",
    prayer: "Pere, pardonne-moi pour les fois ou Tu n'as pas ete ma priorite. Aujourd'hui, je Te remets la premiere place dans mon agenda, mes ambitions et mon coeur. Que Ta volonte soit ma boussole. En nom de Jesus, Amen.",
    declaration: "Je cherche Dieu en premier ! Parce que le Roi de l'univers prend soin de moi, je n'ai besoin de rien eteindre d'anxiete.",
    author: "Pasteur Elvis",
  },
];

export function getDailyDevotion(): Devotion {
  const dayIndex = new Date().getDay(); // 0 = dimanche
  return STATIC_DEVOTIONS[dayIndex];
}
