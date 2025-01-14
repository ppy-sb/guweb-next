import type { GlobalI18n } from '../@types'
import { CountryCode } from '~/def/country-code'
import { Rank } from '~/def'
import { Scope, UserRole } from '~/def/user'

export default {
  // reuse en-GB
  server: {} as any,
  footer: {} as any,

  mode: {} as any,
  ruleset: {} as any,
  rank: {
    [Rank.PPv2]: 'Performance(v2)',
    [Rank.PPv1]: 'Performance(v1)',
    [Rank.RankedScore]: 'Score Classé',
    [Rank.TotalScore]: 'Score Total',
    [Rank.Score]: 'Score',
  },
  title: {
    'leaderboard': 'Classement',
    'status': 'Statut',
    'settings': 'Paramètres',
    'relations': 'Amis & Bloqués',
    'userpage': 'Mon Profil',
    'admin-panel': 'Panneau Administrateur',
    'logs': 'Logs',
    'articles': 'Articles',
    'clans': 'Clans',
    'user-management': 'Gestion d\'utilisateur',
    // TODO refine fr translation
    'account-recovery': 'Account Recovery',
  },

  global: {
    'logout': 'Déconnexion',
    'login': 'Connexion',
    'register': 'Inscription',
    'pp': 'pp',
    'player': 'Joueur',
    'rank': 'Rang',
    'mods': 'Mods',
    'played-at': 'Temps de jeu',
    'acc': 'Acc',
    'accuracy': 'Précision',
    'play-count': 'Nombre de parties',
    'beatmapsets': 'Beatmapsets',
    'beatmaps': 'Beatmaps',
    'users': 'Utilisateur',
    'session': 'Session',
    'password': 'Mot de passe',
    // TODO refine fr translation
    'email': 'Email',
    'otp': 'One time code',
    'verify': 'Verify',
    'wip': 'WIP',
    'max-combo': 'Max combo',
  },
  role: {
    [UserRole.Disabled]: 'Désactivé',
    [UserRole.Restricted]: 'Restreint',
    // [UserRole.Registered]: 'Enregistré',
    [UserRole.Inactive]: 'Inactif',
    [UserRole.Supported]: 'Supporté',
    [UserRole.Supporter]: 'Supporter',
    [UserRole.Verified]: 'Vérifié',
    [UserRole.Alumni]: 'Alumni',
    [UserRole.TournamentStaff]: 'TournamentStaff',
    [UserRole.ChannelModerator]: 'Modérateur de Salon',
    [UserRole.Moderator]: 'Modérateur',
    [UserRole.BeatmapNominator]: 'BN',
    [UserRole.Staff]: 'Staff',
    [UserRole.Admin]: 'Admin',
    [UserRole.Owner]: 'Propriétaire',
    [UserRole.Bot]: 'Bot',
  },

  scope: {
    [Scope.Self]: 'Moi',
    [Scope.Friends]: 'Amis',
    [Scope.Public]: 'Tout le Monde',
  },
  service: {
    logs: 'Logs',
    ranks: 'Classement',
    sessions: 'Connexion Web',
  },

  beatmap: {} as any,

  error: {} as any,
  country: {
    [CountryCode.Unknown]: 'Inconnu',
    [CountryCode.Afghanistan]: 'Afghanistan',
    [CountryCode.AlandIslands]: 'Îles Åland',
    [CountryCode.Albania]: 'Albanie',
    [CountryCode.Algeria]: 'Algérie',
    [CountryCode.AmericanSamoa]: 'Samoa américaines',
    [CountryCode.Andorra]: 'Andorre',
    [CountryCode.Angola]: 'Angola',
    [CountryCode.Anguilla]: 'Anguilla',
    [CountryCode.Antarctica]: 'Antarctique',
    [CountryCode.AntiguaAndBarbuda]: 'Antigua-et-Barbuda',
    [CountryCode.Argentina]: 'Argentine',
    [CountryCode.Armenia]: 'Arménie',
    [CountryCode.Aruba]: 'Aruba',
    [CountryCode.Australia]: 'Australie',
    [CountryCode.Austria]: 'Autriche',
    [CountryCode.Azerbaijan]: 'Azerbaïdjan',
    [CountryCode.Bahamas]: 'Bahamas',
    [CountryCode.Bahrain]: 'Bahreïn',
    [CountryCode.Bangladesh]: 'Bangladesh',
    [CountryCode.Barbados]: 'Barbade',
    [CountryCode.Belarus]: 'Biélorussie',
    [CountryCode.Belgium]: 'Belgique',
    [CountryCode.Belize]: 'Belize',
    [CountryCode.Benin]: 'Bénin',
    [CountryCode.Bermuda]: 'Bermudes',
    [CountryCode.Bhutan]: 'Bhoutan',
    [CountryCode.Bolivia]: 'Bolivie',
    [CountryCode.BonaireSintEustatiusSaba]: 'Bonaire, Saint-Eustache et Saba',
    [CountryCode.BosniaAndHerzegovina]: 'Bosnie-Herzégovine',
    [CountryCode.Botswana]: 'Botswana',
    [CountryCode.BouvetIsland]: 'Île Bouvet',
    [CountryCode.Brazil]: 'Brésil',
    [CountryCode.BritishIndianOceanTerritory]: 'Territoire britannique de l’océan Indien',
    [CountryCode.BruneiDarussalam]: 'Brunei',
    [CountryCode.Bulgaria]: 'Bulgarie',
    [CountryCode.BurkinaFaso]: 'Burkina Faso',
    [CountryCode.Burundi]: 'Burundi',
    [CountryCode.Cambodia]: 'Cambodge',
    [CountryCode.Cameroon]: 'Cameroun',
    [CountryCode.Canada]: 'Canada',
    [CountryCode.CapeVerde]: 'Cap-Vert',
    [CountryCode.CaymanIslands]: 'Îles Caïmans',
    [CountryCode.CentralAfricanRepublic]: 'République centrafricaine',
    [CountryCode.Chad]: 'Tchad',
    [CountryCode.Chile]: 'Chili',
    [CountryCode.China]: 'Chine',
    [CountryCode.ChristmasIsland]: 'Île Christmas',
    [CountryCode.CocosKeelingIslands]: 'Îles Cocos (Keeling)',
    [CountryCode.Colombia]: 'Colombie',
    [CountryCode.Comoros]: 'Comores',
    [CountryCode.Congo]: 'Congo',
    [CountryCode.CongoDemocraticRepublic]: 'République démocratique du Congo',
    [CountryCode.CookIslands]: 'Îles Cook',
    [CountryCode.CostaRica]: 'Costa Rica',
    [CountryCode.CoteDIvoire]: 'Côte d\'Ivoire',
    [CountryCode.Croatia]: 'Croatie',
    [CountryCode.Cuba]: 'Cuba',
    [CountryCode.Curacao]: 'Curaçao',
    [CountryCode.Cyprus]: 'Chypre',
    [CountryCode.CzechRepublic]: 'République tchèque',
    [CountryCode.Denmark]: 'Danemark',
    [CountryCode.Djibouti]: 'Djibouti',
    [CountryCode.Dominica]: 'Dominique',
    [CountryCode.DominicanRepublic]: 'République dominicaine',
    [CountryCode.Ecuador]: 'Équateur',
    [CountryCode.Egypt]: 'Égypte',
    [CountryCode.ElSalvador]: 'Salvador',
    [CountryCode.EquatorialGuinea]: 'Guinée équatoriale',
    [CountryCode.Eritrea]: 'Érythrée',
    [CountryCode.Estonia]: 'Estonie',
    [CountryCode.Ethiopia]: 'Éthiopie',
    [CountryCode.FalklandIslands]: 'Îles Malouines',
    [CountryCode.FaroeIslands]: 'Îles Féroé',
    [CountryCode.Fiji]: 'Fidji',
    [CountryCode.Finland]: 'Finlande',
    [CountryCode.France]: 'France',
    [CountryCode.FrenchGuiana]: 'Guyane française',
    [CountryCode.FrenchPolynesia]: 'Polynésie française',
    [CountryCode.FrenchSouthernTerritories]: 'Terres australes françaises',
    [CountryCode.Gabon]: 'Gabon',
    [CountryCode.Gambia]: 'Gambie',
    [CountryCode.Georgia]: 'Géorgie',
    [CountryCode.Germany]: 'Allemagne',
    [CountryCode.Ghana]: 'Ghana',
    [CountryCode.Gibraltar]: 'Gibraltar',
    [CountryCode.Greece]: 'Grèce',
    [CountryCode.Greenland]: 'Groenland',
    [CountryCode.Grenada]: 'Grenade',
    [CountryCode.Guadeloupe]: 'Guadeloupe',
    [CountryCode.Guam]: 'Guam',
    [CountryCode.Guatemala]: 'Guatemala',
    [CountryCode.Guernsey]: 'Guernesey',
    [CountryCode.Guinea]: 'Guinée',
    [CountryCode.GuineaBissau]: 'Guinée-Bissau',
    [CountryCode.Guyana]: 'Guyana',
    [CountryCode.Haiti]: 'Haïti',
    [CountryCode.HeardIslandMcdonaldIslands]: 'Îles Heard et MacDonald',
    [CountryCode.HolySeeVaticanCityState]: 'État de la Cité du Vatican',
    [CountryCode.Honduras]: 'Honduras',
    [CountryCode.HongKong]: 'Hong Kong',
    [CountryCode.Hungary]: 'Hongrie',
    [CountryCode.Iceland]: 'Islande',
    [CountryCode.India]: 'Inde',
    [CountryCode.Indonesia]: 'Indonésie',
    [CountryCode.Iran]: 'Iran',
    [CountryCode.Iraq]: 'Irak',
    [CountryCode.Ireland]: 'Irlande',
    [CountryCode.IsleOfMan]: 'Île de Man',
    [CountryCode.Israel]: 'Israël',
    [CountryCode.Italy]: 'Italie',
    [CountryCode.Jamaica]: 'Jamaïque',
    [CountryCode.Japan]: 'Japon',
    [CountryCode.Jersey]: 'Jersey',
    [CountryCode.Jordan]: 'Jordanie',
    [CountryCode.Kazakhstan]: 'Kazakhstan',
    [CountryCode.Kenya]: 'Kenya',
    [CountryCode.Kiribati]: 'Kiribati',
    [CountryCode.Korea]: 'Corée',
    [CountryCode.KoreaDemocraticPeoplesRepublic]: 'Corée du Nord',
    [CountryCode.Kuwait]: 'Koweït',
    [CountryCode.Kyrgyzstan]: 'Kirghizistan',
    [CountryCode.LaoPeoplesDemocraticRepublic]: 'Laos',
    [CountryCode.Latvia]: 'Lettonie',
    [CountryCode.Lebanon]: 'Liban',
    [CountryCode.Lesotho]: 'Lesotho',
    [CountryCode.Liberia]: 'Libéria',
    [CountryCode.LibyanArabJamahiriya]: 'Libye',
    [CountryCode.Liechtenstein]: 'Liechtenstein',
    [CountryCode.Lithuania]: 'Lituanie',
    [CountryCode.Luxembourg]: 'Luxembourg',
    [CountryCode.Macao]: 'Macao',
    [CountryCode.Macedonia]: 'Macédoine',
    [CountryCode.Madagascar]: 'Madagascar',
    [CountryCode.Malawi]: 'Malawi',
    [CountryCode.Malaysia]: 'Malaisie',
    [CountryCode.Maldives]: 'Maldives',
    [CountryCode.Mali]: 'Mali',
    [CountryCode.Malta]: 'Malte',
    [CountryCode.MarshallIslands]: 'Îles Marshall',
    [CountryCode.Martinique]: 'Martinique',
    [CountryCode.Mauritania]: 'Mauritanie',
    [CountryCode.Mauritius]: 'Maurice',
    [CountryCode.Mayotte]: 'Mayotte',
    [CountryCode.Mexico]: 'Mexique',
    [CountryCode.Micronesia]: 'Micronésie',
    [CountryCode.Moldova]: 'Moldavie',
    [CountryCode.Monaco]: 'Monaco',
    [CountryCode.Mongolia]: 'Mongolie',
    [CountryCode.Montenegro]: 'Monténégro',
    [CountryCode.Montserrat]: 'Montserrat',
    [CountryCode.Morocco]: 'Maroc',
    [CountryCode.Mozambique]: 'Mozambique',
    [CountryCode.Myanmar]: 'Birmanie',
    [CountryCode.Namibia]: 'Namibie',
    [CountryCode.Nauru]: 'Nauru',
    [CountryCode.Nepal]: 'Népal',
    [CountryCode.Netherlands]: 'Pays-Bas',
    [CountryCode.NewCaledonia]: 'Nouvelle-Calédonie',
    [CountryCode.NewZealand]: 'Nouvelle-Zélande',
    [CountryCode.Nicaragua]: 'Nicaragua',
    [CountryCode.Niger]: 'Niger',
    [CountryCode.Nigeria]: 'Nigeria',
    [CountryCode.Niue]: 'Niue',
    [CountryCode.NorfolkIsland]: 'Île Norfolk',
    [CountryCode.NorthernMarianaIslands]: 'Îles Mariannes du Nord',
    [CountryCode.Norway]: 'Norvège',
    [CountryCode.Oman]: 'Oman',
    [CountryCode.Pakistan]: 'Pakistan',
    [CountryCode.Palau]: 'Palaos',
    [CountryCode.PalestinianTerritory]: 'Territoire palestinien',
    [CountryCode.Panama]: 'Panama',
    [CountryCode.PapuaNewGuinea]: 'Papouasie-Nouvelle-Guinée',
    [CountryCode.Paraguay]: 'Paraguay',
    [CountryCode.Peru]: 'Pérou',
    [CountryCode.Philippines]: 'Philippines',
    [CountryCode.Pitcairn]: 'Îles Pitcairn',
    [CountryCode.Poland]: 'Pologne',
    [CountryCode.Portugal]: 'Portugal',
    [CountryCode.PuertoRico]: 'Porto Rico',
    [CountryCode.Qatar]: 'Qatar',
    [CountryCode.Reunion]: 'Réunion',
    [CountryCode.Romania]: 'Roumanie',
    [CountryCode.RussianFederation]: 'Russie',
    [CountryCode.Rwanda]: 'Rwanda',
    [CountryCode.SaintBarthelemy]: 'Saint-Barthélemy',
    [CountryCode.SaintHelena]: 'Sainte-Hélène',
    [CountryCode.SaintKittsAndNevis]: 'Saint-Christophe-et-Niévès',
    [CountryCode.SaintLucia]: 'Sainte-Lucie',
    [CountryCode.SaintMartin]: 'Saint-Martin',
    [CountryCode.SaintPierreAndMiquelon]: 'Saint-Pierre-et-Miquelon',
    [CountryCode.SaintVincentAndGrenadines]: 'Saint-Vincent-et-les Grenadines',
    [CountryCode.Samoa]: 'Samoa',
    [CountryCode.SanMarino]: 'Saint-Marin',
    [CountryCode.SaoTomeAndPrincipe]: 'Sao Tomé-et-Principe',
    [CountryCode.SaudiArabia]: 'Arabie saoudite',
    [CountryCode.Senegal]: 'Sénégal',
    [CountryCode.Serbia]: 'Serbie',
    [CountryCode.Seychelles]: 'Seychelles',
    [CountryCode.SierraLeone]: 'Sierra Leone',
    [CountryCode.Singapore]: 'Singapour',
    [CountryCode.SintMaarten]: 'Saint-Martin (partie néerlandaise)',
    [CountryCode.Slovakia]: 'Slovaquie',
    [CountryCode.Slovenia]: 'Slovénie',
    [CountryCode.SolomonIslands]: 'Îles Salomon',
    [CountryCode.Somalia]: 'Somalie',
    [CountryCode.SouthAfrica]: 'Afrique du Sud',
    [CountryCode.SouthGeorgiaAndSandwichIsl]: 'Géorgie du Sud-et-les îles Sandwich du Sud',
    [CountryCode.SouthSudan]: 'Soudan du Sud',
    [CountryCode.Spain]: 'Espagne',
    [CountryCode.SriLanka]: 'Sri Lanka',
    [CountryCode.Sudan]: 'Soudan',
    [CountryCode.Suriname]: 'Suriname',
    [CountryCode.SvalbardAndJanMayen]: 'Svalbard et Jan Mayen',
    [CountryCode.Swaziland]: 'Swaziland',
    [CountryCode.Sweden]: 'Suède',
    [CountryCode.Switzerland]: 'Suisse',
    [CountryCode.SyrianArabRepublic]: 'République arabe syrienne',
    [CountryCode.Taiwan]: 'Taïwan',
    [CountryCode.Tajikistan]: 'Tadjikistan',
    [CountryCode.Tanzania]: 'Tanzanie',
    [CountryCode.Thailand]: 'Thaïlande',
    [CountryCode.TimorLeste]: 'Timor oriental',
    [CountryCode.Togo]: 'Togo',
    [CountryCode.Tokelau]: 'Tokélaou',
    [CountryCode.Tonga]: 'Tonga',
    [CountryCode.TrinidadAndTobago]: 'Trinité-et-Tobago',
    [CountryCode.Tunisia]: 'Tunisie',
    [CountryCode.Turkey]: 'Turquie',
    [CountryCode.Turkmenistan]: 'Turkménistan',
    [CountryCode.TurksAndCaicosIslands]: 'Îles Turques et Caïques',
    [CountryCode.Tuvalu]: 'Tuvalu',
    [CountryCode.Uganda]: 'Ouganda',
    [CountryCode.Ukraine]: 'Ukraine',
    [CountryCode.UnitedArabEmirates]: 'Émirats arabes unis',
    [CountryCode.UnitedKingdom]: 'Royaume-Uni',
    [CountryCode.UnitedStates]: 'États-Unis',
    [CountryCode.UnitedStatesOutlyingIslands]: 'Îles mineures éloignées des États-Unis',
    [CountryCode.Uruguay]: 'Uruguay',
    [CountryCode.Uzbekistan]: 'Ouzbékistan',
    [CountryCode.Vanuatu]: 'Vanuatu',
    [CountryCode.Venezuela]: 'Venezuela',
    [CountryCode.Vietnam]: 'Viêt Nam',
    [CountryCode.VirginIslandsBritish]: 'Îles Vierges britanniques',
    [CountryCode.VirginIslandsUS]: 'Îles Vierges américaines',
    [CountryCode.WallisAndFutuna]: 'Wallis et Futuna',
    [CountryCode.WesternSahara]: 'Sahara occidental',
    [CountryCode.Yemen]: 'Yémen',
    [CountryCode.Zambia]: 'Zambie',
    [CountryCode.Zimbabwe]: 'Zimbabwe',
  },
  mail: {} as any,
} satisfies GlobalI18n
