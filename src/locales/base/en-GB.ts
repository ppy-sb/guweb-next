import type { GlobalI18n } from '../@types'
import { CountryCode } from '~/def/country-code'
import { Scope, UserRole } from '~/def/user'
import { Mail } from '~/def/mail'
import { Mode, Rank, Ruleset } from '~/def'
import { GucchoError } from '~/def/messages'
import { RankingStatus } from '~/def/beatmap'

export default {
  server: {
    name: 'Guccho',
  },

  footer: {
    about: 'About',
    resources: 'Resources',
  },

  mode: {
    [Mode.Osu]: 'Osu',
    [Mode.Taiko]: 'Taiko',
    [Mode.Fruits]: 'CTB',
    [Mode.Mania]: 'Mania',
  },
  ruleset: {
    [Ruleset.Standard]: 'Standard',
    [Ruleset.Relax]: 'Relax',
    [Ruleset.Autopilot]: 'Autopilot',
  },
  rank: {
    [Rank.PPv2]: 'Performance(v2)',
    [Rank.PPv1]: 'Performance(v1)',
    [Rank.RankedScore]: 'Ranked Score',
    [Rank.TotalScore]: 'Total Score',
    [Rank.Score]: 'Score',
  },

  title: {
    'leaderboard': 'Leaderboard',
    'status': 'Status',
    'settings': 'Settings',
    'relations': 'Friends & Blocks',
    'userpage': 'My Profile',
    'admin-panel': 'Admin Panel',
    'logs': 'Logs',
    'articles': 'Articles',
    'clans': 'Clans',
    'account-recovery': 'Account Recovery',
    'user-management': 'User Management',
  },
  global: {
    'logout': 'Sign out',
    'login': 'Sign in',
    'register': 'Sign up',
    'pp': 'pp',
    'player': 'Player',
    'rank': 'Rank',
    'mods': 'Mods',
    'played-at': 'Played at',
    'acc': 'Acc',
    'accuracy': 'Accuracy',
    'play-count': 'Play Count',
    'beatmapsets': 'Beatmapsets',
    'beatmaps': 'Beatmaps',
    'users': 'Users',
    'session': 'Session',
    'wip': 'WIP',
    'password': 'Password',
    'email': 'Email',
    'otp': 'One time code',
    'verify': 'Verify',
    'max-combo': 'Max combo',
  },
  role: {
    [UserRole.Disabled]: 'Disabled',
    [UserRole.Restricted]: 'Restricted',
    // [UserRole.Registered]: 'Registered',
    [UserRole.Inactive]: 'Inactive',
    [UserRole.Supported]: 'Supported',
    [UserRole.Supporter]: 'Supporter',
    [UserRole.Verified]: 'Verified',
    [UserRole.Alumni]: 'Alumni',
    [UserRole.TournamentStaff]: 'Tournament Staff',
    [UserRole.ChannelModerator]: 'Channel Moderator',
    [UserRole.Moderator]: 'Moderator',
    [UserRole.BeatmapNominator]: 'Beatmap Nominator',
    [UserRole.Staff]: 'Staff',
    [UserRole.Admin]: 'Admin',
    [UserRole.Owner]: 'Owner',
    [UserRole.Bot]: 'Bot',
  },
  scope: {
    [Scope.Self]: 'Self',
    [Scope.Friends]: 'Friends',
    [Scope.Public]: 'Everyone',
  },
  service: {
    logs: 'Logs',
    ranks: 'Leaderboard',
    sessions: 'Web Login',
  },

  beatmap: {
    status: {
      [RankingStatus.Graveyard]: 'Graveyard',
      [RankingStatus.WIP]: 'WIP',
      [RankingStatus.Pending]: 'Pending',
      [RankingStatus.Ranked]: 'Ranked',
      [RankingStatus.Approved]: 'Approved',
      [RankingStatus.Qualified]: 'Qualified',
      [RankingStatus.Loved]: 'Loved',
      [RankingStatus.Deleted]: 'Deleted',
      [RankingStatus.NotFound]: 'Not Found',
      [RankingStatus.Unknown]: 'Unknown',
    },
  },

  error: {
    [GucchoError.UnknownError]: 'An unknown error occurred.',
    [GucchoError.UserNotFound]: 'User not found.',
    [GucchoError.UserExists]: 'User already exists.',
    [GucchoError.ConflictEmail]: 'This email address is already in use.',
    [GucchoError.IncorrectPassword]: 'Incorrect password.',
    [GucchoError.PasswordNotMatch]: 'Password not match.',
    [GucchoError.OldPasswordMismatch]: 'The old password provided is incorrect.',
    [GucchoError.RelationTypeNotFound]: 'Relation type unknown.',
    [GucchoError.AtLeastOneUserNotExists]: 'At least one user does not exist.',
    [GucchoError.UnableToRetrieveSession]: 'Unable to retrieve session.',
    [GucchoError.UnableToRefreshSession]: 'Unable to update your session.',
    [GucchoError.YouNeedToLogin]: 'You need to log in.',
    [GucchoError.SessionNotFound]: 'Session not found.',
    [GucchoError.UpdateUserSettingsFailed]: 'Failed to update user settings.',
    [GucchoError.ConflictRelation]: 'You already have a relation with this player.',
    [GucchoError.MissingServerAvatarConfig]: 'The server is not configured correctly; avatar location is missing.',
    [GucchoError.ModeNotSupported]: 'Mode not supported.',
    [GucchoError.UpdateUserpageFailed]: 'Failed to update user page.',
    [GucchoError.MimeNotImage]: 'The provided file is not an image.',
    [GucchoError.HackerTryingToDeleteAllAvatars]: 'SOMEONE IS ATTEMPTING TO DELETE ALL AVATARS.',
    [GucchoError.DeletingMoreThanOneAvatars]: 'Attempting to delete more than 2 files. Please contact support to clean your old avatars.',
    [GucchoError.RequireAdminPrivilege]: 'Requires staff roles.',
    [GucchoError.EmailTokenNotFound]: 'Email verification token has expired.',
    [GucchoError.InvalidId]: 'ID Invalid',
    [GucchoError.BeatmapNotFound]: 'Beatmap not found',
    [GucchoError.EmptyPassword]: 'Password cannot be empty',
    [GucchoError.UnableToUpdateSession]: 'Unable to update session.',
  },
  country: {
    [CountryCode.Unknown]: 'Unknown',
    [CountryCode.Afghanistan]: 'Afghanistan',
    [CountryCode.AlandIslands]: 'Aland Islands',
    [CountryCode.Albania]: 'Albania',
    [CountryCode.Algeria]: 'Algeria',
    [CountryCode.AmericanSamoa]: 'American Samoa',
    [CountryCode.Andorra]: 'Andorra',
    [CountryCode.Angola]: 'Angola',
    [CountryCode.Anguilla]: 'Anguilla',
    [CountryCode.Antarctica]: 'Antarctica',
    [CountryCode.AntiguaAndBarbuda]: 'Antigua and Barbuda',
    [CountryCode.Argentina]: 'Argentina',
    [CountryCode.Armenia]: 'Armenia',
    [CountryCode.Aruba]: 'Aruba',
    [CountryCode.Australia]: 'Australia',
    [CountryCode.Austria]: 'Austria',
    [CountryCode.Azerbaijan]: 'Azerbaijan',
    [CountryCode.Bahamas]: 'Bahamas',
    [CountryCode.Bahrain]: 'Bahrain',
    [CountryCode.Bangladesh]: 'Bangladesh',
    [CountryCode.Barbados]: 'Barbados',
    [CountryCode.Belarus]: 'Belarus',
    [CountryCode.Belgium]: 'Belgium',
    [CountryCode.Belize]: 'Belize',
    [CountryCode.Benin]: 'Benin',
    [CountryCode.Bermuda]: 'Bermuda',
    [CountryCode.Bhutan]: 'Bhutan',
    [CountryCode.Bolivia]: 'Bolivia',
    [CountryCode.BonaireSintEustatiusSaba]: 'Bonaire, Sint Eustatius, and Saba',
    [CountryCode.BosniaAndHerzegovina]: 'Bosnia and Herzegovina',
    [CountryCode.Botswana]: 'Botswana',
    [CountryCode.BouvetIsland]: 'Bouvet Island',
    [CountryCode.Brazil]: 'Brazil',
    [CountryCode.BritishIndianOceanTerritory]: 'British Indian Ocean Territory',
    [CountryCode.BruneiDarussalam]: 'Brunei Darussalam',
    [CountryCode.Bulgaria]: 'Bulgaria',
    [CountryCode.BurkinaFaso]: 'Burkina Faso',
    [CountryCode.Burundi]: 'Burundi',
    [CountryCode.Cambodia]: 'Cambodia',
    [CountryCode.Cameroon]: 'Cameroon',
    [CountryCode.Canada]: 'Canada',
    [CountryCode.CapeVerde]: 'Cape Verde',
    [CountryCode.CaymanIslands]: 'Cayman Islands',
    [CountryCode.CentralAfricanRepublic]: 'Central African Republic',
    [CountryCode.Chad]: 'Chad',
    [CountryCode.Chile]: 'Chile',
    [CountryCode.China]: 'China',
    [CountryCode.ChristmasIsland]: 'Christmas Island',
    [CountryCode.CocosKeelingIslands]: 'Cocos (Keeling) Islands',
    [CountryCode.Colombia]: 'Colombia',
    [CountryCode.Comoros]: 'Comoros',
    [CountryCode.Congo]: 'Congo',
    [CountryCode.CongoDemocraticRepublic]: 'Congo, Democratic Republic',
    [CountryCode.CookIslands]: 'Cook Islands',
    [CountryCode.CostaRica]: 'Costa Rica',
    [CountryCode.CoteDIvoire]: 'Cote d\'Ivoire',
    [CountryCode.Croatia]: 'Croatia',
    [CountryCode.Cuba]: 'Cuba',
    [CountryCode.Curacao]: 'Curacao',
    [CountryCode.Cyprus]: 'Cyprus',
    [CountryCode.CzechRepublic]: 'Czech Republic',
    [CountryCode.Denmark]: 'Denmark',
    [CountryCode.Djibouti]: 'Djibouti',
    [CountryCode.Dominica]: 'Dominica',
    [CountryCode.DominicanRepublic]: 'Dominican Republic',
    [CountryCode.Ecuador]: 'Ecuador',
    [CountryCode.Egypt]: 'Egypt',
    [CountryCode.ElSalvador]: 'El Salvador',
    [CountryCode.EquatorialGuinea]: 'Equatorial Guinea',
    [CountryCode.Eritrea]: 'Eritrea',
    [CountryCode.Estonia]: 'Estonia',
    [CountryCode.Ethiopia]: 'Ethiopia',
    [CountryCode.FalklandIslands]: 'Falkland Islands',
    [CountryCode.FaroeIslands]: 'Faroe Islands',
    [CountryCode.Fiji]: 'Fiji',
    [CountryCode.Finland]: 'Finland',
    [CountryCode.France]: 'France',
    [CountryCode.FrenchGuiana]: 'French Guiana',
    [CountryCode.FrenchPolynesia]: 'French Polynesia',
    [CountryCode.FrenchSouthernTerritories]: 'French Southern Territories',
    [CountryCode.Gabon]: 'Gabon',
    [CountryCode.Gambia]: 'Gambia',
    [CountryCode.Georgia]: 'Georgia',
    [CountryCode.Germany]: 'Germany',
    [CountryCode.Ghana]: 'Ghana',
    [CountryCode.Gibraltar]: 'Gibraltar',
    [CountryCode.Greece]: 'Greece',
    [CountryCode.Greenland]: 'Greenland',
    [CountryCode.Grenada]: 'Grenada',
    [CountryCode.Guadeloupe]: 'Guadeloupe',
    [CountryCode.Guam]: 'Guam',
    [CountryCode.Guatemala]: 'Guatemala',
    [CountryCode.Guernsey]: 'Guernsey',
    [CountryCode.Guinea]: 'Guinea',
    [CountryCode.GuineaBissau]: 'Guinea-Bissau',
    [CountryCode.Guyana]: 'Guyana',
    [CountryCode.Haiti]: 'Haiti',
    [CountryCode.HeardIslandMcdonaldIslands]: 'Heard Island and McDonald Islands',
    [CountryCode.HolySeeVaticanCityState]: 'Holy See (Vatican City State)',
    [CountryCode.Honduras]: 'Honduras',
    [CountryCode.HongKong]: 'Hong Kong',
    [CountryCode.Hungary]: 'Hungary',
    [CountryCode.Iceland]: 'Iceland',
    [CountryCode.India]: 'India',
    [CountryCode.Indonesia]: 'Indonesia',
    [CountryCode.Iran]: 'Iran',
    [CountryCode.Iraq]: 'Iraq',
    [CountryCode.Ireland]: 'Ireland',
    [CountryCode.IsleOfMan]: 'Isle of Man',
    [CountryCode.Israel]: 'Israel',
    [CountryCode.Italy]: 'Italy',
    [CountryCode.Jamaica]: 'Jamaica',
    [CountryCode.Japan]: 'Japan',
    [CountryCode.Jersey]: 'Jersey',
    [CountryCode.Jordan]: 'Jordan',
    [CountryCode.Kazakhstan]: 'Kazakhstan',
    [CountryCode.Kenya]: 'Kenya',
    [CountryCode.Kiribati]: 'Kiribati',
    [CountryCode.Korea]: 'Korea',
    [CountryCode.KoreaDemocraticPeoplesRepublic]: 'Korea, Democratic People\'s Republic',
    [CountryCode.Kuwait]: 'Kuwait',
    [CountryCode.Kyrgyzstan]: 'Kyrgyzstan',
    [CountryCode.LaoPeoplesDemocraticRepublic]: 'Lao People\'s Democratic Republic',
    [CountryCode.Latvia]: 'Latvia',
    [CountryCode.Lebanon]: 'Lebanon',
    [CountryCode.Lesotho]: 'Lesotho',
    [CountryCode.Liberia]: 'Liberia',
    [CountryCode.LibyanArabJamahiriya]: 'Libyan Arab Jamahiriya',
    [CountryCode.Liechtenstein]: 'Liechtenstein',
    [CountryCode.Lithuania]: 'Lithuania',
    [CountryCode.Luxembourg]: 'Luxembourg',
    [CountryCode.Macao]: 'Macao',
    [CountryCode.Macedonia]: 'Macedonia',
    [CountryCode.Madagascar]: 'Madagascar',
    [CountryCode.Malawi]: 'Malawi',
    [CountryCode.Malaysia]: 'Malaysia',
    [CountryCode.Maldives]: 'Maldives',
    [CountryCode.Mali]: 'Mali',
    [CountryCode.Malta]: 'Malta',
    [CountryCode.MarshallIslands]: 'Marshall Islands',
    [CountryCode.Martinique]: 'Martinique',
    [CountryCode.Mauritania]: 'Mauritania',
    [CountryCode.Mauritius]: 'Mauritius',
    [CountryCode.Mayotte]: 'Mayotte',
    [CountryCode.Mexico]: 'Mexico',
    [CountryCode.Micronesia]: 'Micronesia',
    [CountryCode.Moldova]: 'Moldova',
    [CountryCode.Monaco]: 'Monaco',
    [CountryCode.Mongolia]: 'Mongolia',
    [CountryCode.Montenegro]: 'Montenegro',
    [CountryCode.Montserrat]: 'Montserrat',
    [CountryCode.Morocco]: 'Morocco',
    [CountryCode.Mozambique]: 'Mozambique',
    [CountryCode.Myanmar]: 'Myanmar',
    [CountryCode.Namibia]: 'Namibia',
    [CountryCode.Nauru]: 'Nauru',
    [CountryCode.Nepal]: 'Nepal',
    [CountryCode.Netherlands]: 'Netherlands',
    [CountryCode.NewCaledonia]: 'New Caledonia',
    [CountryCode.NewZealand]: 'New Zealand',
    [CountryCode.Nicaragua]: 'Nicaragua',
    [CountryCode.Niger]: 'Niger',
    [CountryCode.Nigeria]: 'Nigeria',
    [CountryCode.Niue]: 'Niue',
    [CountryCode.NorfolkIsland]: 'Norfolk Island',
    [CountryCode.NorthernMarianaIslands]: 'Northern Mariana Islands',
    [CountryCode.Norway]: 'Norway',
    [CountryCode.Oman]: 'Oman',
    [CountryCode.Pakistan]: 'Pakistan',
    [CountryCode.Palau]: 'Palau',
    [CountryCode.PalestinianTerritory]: 'Palestinian Territory',
    [CountryCode.Panama]: 'Panama',
    [CountryCode.PapuaNewGuinea]: 'Papua New Guinea',
    [CountryCode.Paraguay]: 'Paraguay',
    [CountryCode.Peru]: 'Peru',
    [CountryCode.Philippines]: 'Philippines',
    [CountryCode.Pitcairn]: 'Pitcairn',
    [CountryCode.Poland]: 'Poland',
    [CountryCode.Portugal]: 'Portugal',
    [CountryCode.PuertoRico]: 'Puerto Rico',
    [CountryCode.Qatar]: 'Qatar',
    [CountryCode.Reunion]: 'Reunion',
    [CountryCode.Romania]: 'Romania',
    [CountryCode.RussianFederation]: 'Russian Federation',
    [CountryCode.Rwanda]: 'Rwanda',
    [CountryCode.SaintBarthelemy]: 'Saint Barthelemy',
    [CountryCode.SaintHelena]: 'Saint Helena',
    [CountryCode.SaintKittsAndNevis]: 'Saint Kitts and Nevis',
    [CountryCode.SaintLucia]: 'Saint Lucia',
    [CountryCode.SaintMartin]: 'Saint Martin',
    [CountryCode.SaintPierreAndMiquelon]: 'Saint Pierre and Miquelon',
    [CountryCode.SaintVincentAndGrenadines]: 'Saint Vincent and the Grenadines',
    [CountryCode.Samoa]: 'Samoa',
    [CountryCode.SanMarino]: 'San Marino',
    [CountryCode.SaoTomeAndPrincipe]: 'Sao Tome and Principe',
    [CountryCode.SaudiArabia]: 'Saudi Arabia',
    [CountryCode.Senegal]: 'Senegal',
    [CountryCode.Serbia]: 'Serbia',
    [CountryCode.Seychelles]: 'Seychelles',
    [CountryCode.SierraLeone]: 'Sierra Leone',
    [CountryCode.Singapore]: 'Singapore',
    [CountryCode.SintMaarten]: 'Sint Maarten',
    [CountryCode.Slovakia]: 'Slovakia',
    [CountryCode.Slovenia]: 'Slovenia',
    [CountryCode.SolomonIslands]: 'Solomon Islands',
    [CountryCode.Somalia]: 'Somalia',
    [CountryCode.SouthAfrica]: 'South Africa',
    [CountryCode.SouthGeorgiaAndSandwichIsl]: 'South Georgia and the South Sandwich Islands',
    [CountryCode.SouthSudan]: 'South Sudan',
    [CountryCode.Spain]: 'Spain',
    [CountryCode.SriLanka]: 'Sri Lanka',
    [CountryCode.Sudan]: 'Sudan',
    [CountryCode.Suriname]: 'Suriname',
    [CountryCode.SvalbardAndJanMayen]: 'Svalbard and Jan Mayen',
    [CountryCode.Swaziland]: 'Swaziland',
    [CountryCode.Sweden]: 'Sweden',
    [CountryCode.Switzerland]: 'Switzerland',
    [CountryCode.SyrianArabRepublic]: 'Syrian Arab Republic',
    [CountryCode.Taiwan]: 'Taiwan',
    [CountryCode.Tajikistan]: 'Tajikistan',
    [CountryCode.Tanzania]: 'Tanzania',
    [CountryCode.Thailand]: 'Thailand',
    [CountryCode.TimorLeste]: 'Timor-Leste',
    [CountryCode.Togo]: 'Togo',
    [CountryCode.Tokelau]: 'Tokelau',
    [CountryCode.Tonga]: 'Tonga',
    [CountryCode.TrinidadAndTobago]: 'Trinidad and Tobago',
    [CountryCode.Tunisia]: 'Tunisia',
    [CountryCode.Turkey]: 'Turkey',
    [CountryCode.Turkmenistan]: 'Turkmenistan',
    [CountryCode.TurksAndCaicosIslands]: 'Turks and Caicos Islands',
    [CountryCode.Tuvalu]: 'Tuvalu',
    [CountryCode.Uganda]: 'Uganda',
    [CountryCode.Ukraine]: 'Ukraine',
    [CountryCode.UnitedArabEmirates]: 'United Arab Emirates',
    [CountryCode.UnitedKingdom]: 'United Kingdom',
    [CountryCode.UnitedStates]: 'United States',
    [CountryCode.UnitedStatesOutlyingIslands]: 'United States Outlying Islands',
    [CountryCode.Uruguay]: 'Uruguay',
    [CountryCode.Uzbekistan]: 'Uzbekistan',
    [CountryCode.Vanuatu]: 'Vanuatu',
    [CountryCode.Venezuela]: 'Venezuela',
    [CountryCode.Vietnam]: 'Vietnam',
    [CountryCode.VirginIslandsBritish]: 'Virgin Islands (British)',
    [CountryCode.VirginIslandsUS]: 'Virgin Islands (US)',
    [CountryCode.WallisAndFutuna]: 'Wallis and Futuna',
    [CountryCode.WesternSahara]: 'Western Sahara',
    [CountryCode.Yemen]: 'Yemen',
    [CountryCode.Zambia]: 'Zambia',
    [CountryCode.Zimbabwe]: 'Zimbabwe',
  },
  mail: {
    [Mail.Variant.Registration]: {
      subject: '{serverName} - Account Registration',
      content: `
Hi,

To verify your email for {serverName}, please proceed with the following link:
{link}

Alternatively, you can use the following code: {otp}

Verification is valid for {ttl} minutes.
Please let us know if you have any questions or concerns.

{serverName}
`,
    },
    [Mail.Variant.AccountRecovery]: {
      subject: '{serverName} - Account Recovery',
      content: `
Hi {name},

To reset your password for {serverName}, please proceed with the following link:
{link}

Alternatively, you can use the following code: {otp}

Verification is valid for {ttl} minutes.

{serverName}
`,
    },
    [Mail.Variant.ChangeMail]: {
      subject: '{serverName} - Change Email Address',
      content: `
Hi {name},

To change your email for {serverName}, please continue with the following code:
{otp}

Verification is valid for {ttl} minutes.

{serverName}
`,
    },
  },
} satisfies GlobalI18n as GlobalI18n
