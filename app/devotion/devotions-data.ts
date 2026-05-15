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

// 7 méditations de référence (tournent selon le jour de la semaine)
export const STATIC_DEVOTIONS: Devotion[] = [
  {
    id: null,
    title: "Marcher dans la foi",
    verse_ref: "Hébreux 11:1",
    verse_text: "Or la foi est une ferme assurance des choses qu'on espère, une démonstration de celles qu'on ne voit pas.",
    content: `La foi est le fondement invisible de tout ce que nous espérons. Elle n'est pas un sentiment fragile qui vacille au moindre vent contraire — c'est une conviction ancrée dans le caractère immuable de Dieu.\n\nAbraham quitta son pays sans savoir où il allait. Moïse traversa la mer Rouge sans voir le chemin. Marie accepta l'impossible. Chacun d'eux marcha par la foi, non par la vue.\n\nAujourd'hui, vos circonstances racontent peut-être une histoire différente de ce que Dieu vous a promis. C'est dans cet écart que la foi prend tout son sens : elle choisit de croire la Parole de Dieu plutôt que les faits visibles.`,
    application: "Identifiez une promesse de Dieu que vous avez du mal à croire. Écrivez-la, affichez-la, et déclarez-la à voix haute trois fois aujourd'hui.",
    prayer: "Père céleste, je te confie mes doutes et mes peurs. Augmente ma foi là où elle est faible. Apprends-moi à m'appuyer sur Tes promesses plutôt que sur mes propres forces. Que ma foi produise des actes concrets aujourd'hui. Au nom de Jésus, Amen.",
    declaration: "Je marche par la foi et non par la vue. Les promesses de Dieu sont oui et amen dans ma vie !",
    author: "Rév. Elvis NGUIFFO",
  },
  {
    id: null,
    title: "La puissance de la prière",
    verse_ref: "Matthieu 7:7",
    verse_text: "Demandez, et l'on vous donnera ; cherchez, et vous trouverez ; frappez, et l'on vous ouvrira.",
    content: `Jésus ne dit pas « demandez si vous le méritez » ni « frappez si vous êtes suffisamment saints ». Il dit simplement : demandez. Il y a dans cette invitation une confiance extraordinaire de Dieu envers Ses enfants.\n\nLa prière n'est pas une technique magique — c'est une relation. C'est le fils qui s'approche du Père, le disciple qui s'assied aux pieds du Maître. Et dans cette relation, le Dieu de l'univers se penche et écoute.\n\nNe laissez jamais le sentiment d'indignité vous éloigner de la prière. C'est précisément dans notre fragilité que la grâce de Dieu se manifeste avec le plus d'éclat.`,
    application: "Prenez 15 minutes aujourd'hui pour prier à voix haute. Formulez trois requêtes précises. Datez-les dans un carnet pour célébrer les réponses.",
    prayer: "Seigneur, merci d'avoir ouvert la porte de Ta présence. Apprends-moi à persévérer dans la prière, à chercher Ta face et non seulement Ta main. Que ma vie de prière soit un témoignage vivant de Ta fidélité. Au nom de Jésus, Amen.",
    declaration: "Je suis un enfant du Roi. Ma prière touche le cœur de Dieu et fait bouger les montagnes !",
    author: "Rév. Elvis NGUIFFO",
  },
  {
    id: null,
    title: "Renouveler son esprit",
    verse_ref: "Romains 12:2",
    verse_text: "Ne vous conformez pas au siècle présent, mais soyez transformés par le renouvellement de l'intelligence.",
    content: `Notre culture nous bombarde de messages : soyez ceci, désirez cela, vous valez autant. Si nous ne filtrons pas activement ce que nous absorbons, notre esprit se moule imperceptiblement au monde.\n\nPaul nous appelle à une transformation radicale : le renouvellement de l'intelligence. Ce n'est pas un effort de volonté humaine — c'est un processus spirituel enclenché par la Parole de Dieu et l'Esprit Saint.\n\nChaque matin que vous passez dans la Parole est une session de déconditionnement. Chaque prière est un recalibrage. Chaque louange est un refus de laisser le monde définir votre identité.`,
    application: "Avant de consulter votre téléphone ce matin, lisez un chapitre de la Bible. Laissez la Parole de Dieu être la première voix que vous entendez.",
    prayer: "Esprit Saint, renouvelle mon intelligence aujourd'hui. Là où le monde a semé des mensonges, plante la vérité de Ta Parole. Transforme ma façon de penser pour qu'elle ressemble de plus en plus à celle de Christ. Amen.",
    declaration: "Mon intelligence est renouvelée par la Parole de Dieu. Je reconnais et je refuse les mensonges du monde. Je pense comme Christ !",
    author: "Rév. Elvis NGUIFFO",
  },
  {
    id: null,
    title: "Persévérer dans l'épreuve",
    verse_ref: "Jacques 1:2-3",
    verse_text: "Mes frères, regardez comme un sujet de joie complète les diverses épreuves auxquelles vous pouvez être exposés, sachant que l'épreuve de votre foi produit la patience.",
    content: `Comment peut-on regarder une épreuve avec joie ? C'est l'un des paradoxes les plus provocants de l'Écriture. Jacques ne nous invite pas au masochisme spirituel — il nous révèle une vérité cachée : la souffrance porte en elle les graines de la croissance.\n\nL'or n'est pas détruit par le feu — il est purifié. De même, les épreuves ne nous détruisent pas si nous nous appuyons sur Dieu ; elles éliminent les impuretés et révèlent l'or de notre foi.\n\nDieu ne vous a pas abandonné dans votre douleur. Il est au cœur de l'épreuve avec vous, sculptant en vous un caractère qui reflète Son Fils.`,
    application: "Nommez votre épreuve actuelle. Demandez à Dieu de vous montrer ce qu'Il veut produire à travers elle. Choisissez de Lui faire confiance pour le processus.",
    prayer: "Père, je ne comprends pas toujours Tes voies, mais je Te fais confiance. Utilise ce temps difficile pour me façonner. Donne-moi la grâce de persévérer avec joie. Je sais que Tu tiens toutes choses en main. Au nom de Jésus, Amen.",
    declaration: "Mes épreuves ne me définissent pas — elles me raffinent ! Je sors de chaque tempête plus fort, plus sage, plus confiant en Dieu.",
    author: "Rév. Elvis NGUIFFO",
  },
  {
    id: null,
    title: "Être sel et lumière",
    verse_ref: "Matthieu 5:14",
    verse_text: "Vous êtes la lumière du monde. Une ville située sur une montagne ne peut être cachée.",
    content: `Jésus ne dit pas « devenez la lumière du monde si vous en faites assez ». Il déclare ce que vous êtes déjà. L'identité précède la mission.\n\nUne lampe ne s'efforce pas de briller. Elle brille parce que c'est sa nature. De même, lorsque vous vivez connecté à Christ — la Lumière du monde — vous rayonnez naturellement.\n\nVotre témoignage n'est pas réservé aux grandes scènes ou aux grandes plateformes. Il se joue dans la façon dont vous traitez la caissière, dont vous parlez de vos collègues, dont vous réagissez face à l'injustice.`,
    application: "Aujourd'hui, cherchez délibérément une occasion d'être lumière : un encouragement sincère, un acte de service inattendu, une parole de grâce dans une conversation difficile.",
    prayer: "Seigneur, que Ta lumière brille à travers moi aujourd'hui. Que les gens voient non pas moi, mais Toi à travers mes actes et mes paroles. Utilise-moi comme instrument de Ton amour dans la vie de ceux que je croiserai. Amen.",
    declaration: "Je suis lumière dans ce monde ! La gloire de Dieu brille à travers ma vie et attire les hommes vers Lui.",
    author: "Rév. Elvis NGUIFFO",
  },
  {
    id: null,
    title: "L'amour qui dépasse toute connaissance",
    verse_ref: "Jean 3:16",
    verse_text: "Car Dieu a tant aimé le monde qu'il a donné son Fils unique, afin que quiconque croit en lui ne périsse point, mais qu'il ait la vie éternelle.",
    content: `« Tant aimé » — deux mots qui contiennent l'infinité de Dieu. Non pas un amour conditionnel, transactionnel ou mérité. Un amour qui a tout donné avant que nous demandions quoi que ce soit.\n\nDans un monde où tout se mérite et tout s'achète, l'amour de Dieu est une révolution. Il n'aime pas parce que vous êtes bon — Il vous rend bon parce qu'Il vous aime.\n\nLaissez cet amour pénétrer au-delà de votre théologie et toucher votre cœur aujourd'hui. Vous n'êtes pas un projet à améliorer pour Dieu — vous êtes un fils, une fille, bien-aimé(e).`,
    application: "Prenez cinq minutes pour recevoir l'amour de Dieu en silence. Pas de liste de requêtes — juste vous, et Lui, et Ses mots : « Tu m'appartiens. Je t'aime. »",
    prayer: "Père, merci pour un amour que je ne peux pas mériter et que rien ne peut ôter. Que cet amour soit ma fondation, ma sécurité, ma source. Libère-moi de tout besoin d'approbation humaine — Ta validation suffit. Au nom de Jésus, Amen.",
    declaration: "Je suis aimé(e) d'un amour éternel et inconditionnel. Rien ne peut me séparer de l'amour de Dieu !",
    author: "Rév. Elvis NGUIFFO",
  },
  {
    id: null,
    title: "Chercher Sa présence en premier",
    verse_ref: "Matthieu 6:33",
    verse_text: "Cherchez premièrement le royaume et la justice de Dieu ; et toutes ces choses vous seront données par-dessus.",
    content: `Nous vivons dans une culture de la priorité inversée : d'abord la carrière, ensuite Dieu si le temps le permet. D'abord l'argent, le confort, la reconnaissance — puis le reste.\n\nJésus renverse cette logique avec une promesse audacieuse : mettez Dieu en premier, et tout le reste sera ajouté. Ce n'est pas de la magie — c'est un principe de royaume.\n\nQuand Dieu est au centre, tout s'aligne autour de Lui : vos priorités deviennent justes, vos décisions claires, votre paix profonde. Vous cessez de courir après ce que le Père a déjà prévu de donner à Ses enfants.`,
    application: "Avant de commencer votre journée de travail, consacrez les 10 premières minutes à adorer Dieu — pas à demander, juste à Le chercher pour Lui-même.",
    prayer: "Père, pardonne-moi pour les fois où Tu n'as pas été ma priorité. Aujourd'hui, je Te remets la première place dans mon agenda, mes ambitions et mon cœur. Que Ta volonté soit ma boussole. Au nom de Jésus, Amen.",
    declaration: "Je cherche Dieu en premier ! Parce que le Roi de l'univers prend soin de moi, je n'ai besoin de rien craindre.",
    author: "Rév. Elvis NGUIFFO",
  },
];

export function getDailyDevotion(): Devotion {
  const dayIndex = new Date().getDay(); // 0 = dimanche
  return STATIC_DEVOTIONS[dayIndex];
}
