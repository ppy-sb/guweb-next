import enGB from './en-GB'
import type { GlobalI18n } from './@types'
import { Rank } from '~/def'
import { Scope, UserPrivilege } from '~/def/user'

export default {
  mode: enGB.mode,
  ruleset: enGB.ruleset,
  rank: {
    [Rank.PPv2]: 'Performance(v2)',
    [Rank.PPv1]: 'Performance(v1)',
    [Rank.RankedScore]: '计入排行榜的总分',
    [Rank.TotalScore]: '总分',
    [Rank.Score]: '分数',
  },
  titles: {
    'leaderboard': '排行榜',
    'status': '状态',
    'settings': '设置',
    'relations': '好友 & 黑名单',
    'userpage': '用户页面',
    'admin-panel': '管理面板',
    'logs': '系统日志',
    'articles': '文章',
  },
  global: {
    'logout': '登出',
    'login': '登录',
    'register': '注册',
    'pp': 'pp',
    'player': '玩家',
    'rank': '排名',
    'mods': 'mods',
    'played-at': '游玩时间',
    'acc': '准确度',
    'beatmapsets': '图组',
    'beatmaps': '图',
    'users': '用户',
    'session': '会话',
    'accuracy': '准确度',
    'play-count': '游玩次数',
  },
  priv: {
    [UserPrivilege.Disabled]: '被禁用',
    [UserPrivilege.Restricted]: '已被封禁',
    [UserPrivilege.Registered]: '已注册',
    [UserPrivilege.Inactive]: '不活跃的',
    [UserPrivilege.Normal]: '普通',
    [UserPrivilege.Supported]: '赞助过',
    [UserPrivilege.Supporter]: '赞助者',
    [UserPrivilege.Verified]: '认证用户',
    [UserPrivilege.Alumni]: 'Alumni',
    [UserPrivilege.TournamentStuff]: 'TournamentStuff',
    [UserPrivilege.ChannelModerator]: 'ChannelModerator',
    [UserPrivilege.Moderator]: '聊天管理员',
    [UserPrivilege.BeatmapNominator]: 'BN',
    [UserPrivilege.Staff]: 'Staff',
    [UserPrivilege.Admin]: '管理员',
    [UserPrivilege.Owner]: 'Owner',
    [UserPrivilege.Bot]: 'Bot',
  },
  scope: {
    [Scope.Self]: '自己',
    [Scope.Friends]: '仅好友',
    [Scope.Public]: '公开',
  },
} satisfies GlobalI18n as GlobalI18n
