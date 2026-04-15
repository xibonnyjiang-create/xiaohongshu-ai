import { TopicType, PersonaType } from './types';

/**
 * 场景化Prompt模板
 * 每个场景有独立的Hook设计、逻辑骨架、业务植入和行动引导
 */

// ==================== 场景Prompt模板 ====================

export interface ScenarioPromptConfig {
  topicType: TopicType;
  hook: string;           // Hook设计
  logicFramework: string; // 逻辑骨架
  businessInsert: string; // 业务植入
  actionGuide: string;   // 行动引导
  deepAnalysisConfig?: {
    macroAnalysis: string;   // 宏观定调
    microAnalysis: string;    // 微观拆解
    complianceOutlook: string; // 合规展望
  };
}

// 四大场景的Prompt配置
export const SCENARIO_PROMPTS: Record<TopicType, ScenarioPromptConfig> = {
  // 【场景1】市场热点：深度解析核心逻辑
  market_hot: {
    topicType: 'market_hot',
    hook: '利用强反差标题（如：AI集体暴涨？幕后推手是谁？）',
    logicFramework: `【现状描述】当前行情波动的具体表现
【逻辑拆解】重点解析波动的底层原因（地缘/政策/资金）
【AI辅助】用大白话把涨跌原因讲得很透`,
    businessInsert: `在分析过程中自然插入：
"遇到这种看不懂的行情，我习惯直接用微证券里的【问元宝】AI功能，它能大白话把涨跌原因讲得很透"

关键词：问元宝、AI解析、市场解读`,
    actionGuide: `微信热股榜单实时更新，快人一步掌握最新资讯
强调：微信搜索微证券，即点即用`,
    deepAnalysisConfig: {
      macroAnalysis: `通过深度资讯检索，分析事件对资产定价的底层逻辑
（如：美联储降息对估值的修复逻辑）
引用机构研报数据，展示微证券内"实时研报资讯"`,
      microAnalysis: `拆解板块轮动顺序，分析主力资金流向和行业景气度
引导用户通过微证券查看"行业龙虎榜"或"北向资金动向"`,
      complianceOutlook: `使用中性词（如"逻辑立得住"、"赔率高"）替代保证性言论
必须输出"COMPLIANCE_FIXED"级别的风险警示语`
    }
  },

  // 【场景2】小白科普：低门槛/极简UI
  beginner_guide: {
    topicType: 'beginner_guide',
    hook: '使用身份认同或消除畏难情绪（如：手把手教小白买第一支股）',
    logicFramework: `【生活化类比】将硬核金融概念类比为日常生活场景
（如：买ETF像选奶茶拼盘）
【去术语化】用最通俗的语言解释专业概念
【极简工具引导】强调微证券界面清爽，没有迷宫式APP的焦虑`,
    businessInsert: `强调"微证券界面清爽，没有迷宫式APP的焦虑，微信搜索即点即用"

关键词：微信直达、极简界面、小白友好、零门槛`,
    actionGuide: `微信直达，不用特地下载独立APP，告别繁琐
强调：下拉微信搜一搜，秒开即用`,
    deepAnalysisConfig: {
      macroAnalysis: `从宏观经济角度解释基本概念（如：什么是GDP、CPI）
用生活案例类比（房价、工资、物价）`,
      microAnalysis: `介绍常见的基金产品分类（货币基金、债券基金、股票基金）
对比不同产品的风险收益特征`,
      complianceOutlook: `强调"投资有风险，入市需谨慎"
提示"过往业绩不代表未来表现"`
    }
  },

  // 【场景3】工具测评：及时性/波动提醒
  tool_review: {
    topicType: 'tool_review',
    hook: '打造测评官人设（如：股市必备APP合集！卸载了3个软件后发现它）',
    logicFramework: `【痛点共鸣】对比传统APP操作繁琐、漏看信息的痛点
【测评红黑榜】客观评价各产品的优缺点
【碎片化管理】强调不用常驻APP也能抓买卖点`,
    businessInsert: `突出"微信消息每日提醒"和"股价波动提醒"
强调不用常驻APP也能抓买卖点

关键词：微信提醒、波动提醒、轻量级、实时通知`,
    actionGuide: `作为微信原生工具，最核心优势是及时通知与轻量体验
强调：微信浮窗、消息提醒、不错过行情`,
    deepAnalysisConfig: {
      macroAnalysis: `分析当前市场中投资者的信息获取渠道
对比专业软件vs轻量工具的使用场景`,
      microAnalysis: `详细介绍微证券的各项功能（股价提醒、浮窗、分享等）
对比竞品功能差异`,
      complianceOutlook: `客观描述功能，不做收益承诺
提示："提醒功能仅供参考，不构成投资建议"`
    }
  },

  // 【场景4】生活化种草：职场与生活场景渗透
  life_lifestyle: {
    topicType: 'life_lifestyle',
    hook: `锁定职场场景（如：打工人的隐蔽摸鱼理财法）
锁定社交场景（如：别再发模糊的股票截图了）`,
    logicFramework: `【场景代入】描述上班/开会没空盯盘、怕被老板发现的真实窘境
【碎片化时间】等电梯、挤地铁，10秒钟看清今日收益
【无缝社交】群聊里讨论股票，截图繁琐、不够直观`,
    businessInsert: `主打"PC/手机双端浮窗，下拉即看行情"的隐蔽性
强调"一键分享个股卡片给微信好友/群组"

关键词：隐蔽盯盘、浮窗功能、一键分享、PC端/手机端双端`,
    actionGuide: `支持手机PC双端浮窗，打工人摸鱼必备
微信搜一搜小程序【微证券】，讨论个股一键分享
强调："老板以为我在回微信，其实我正下拉看微证券盯盘"`,
    deepAnalysisConfig: {
      macroAnalysis: `分析职场人群的理财需求和痛点
数据支撑：现代人理财时间碎片化趋势`,
      microAnalysis: `详细介绍浮窗功能的具体使用场景
分享功能在社交中的实际应用`,
      complianceOutlook: `强调功能便捷性，不涉及具体投资建议
提示："分享内容仅供参考交流"`
    }
  }
};

// 工具测评场景补充：深度分析专属内容
export const TOOL_REVIEW_DEEP_CONTENT = {
  // 红榜功能
  redListFeatures: [
    { feature: '微信消息提醒', advantage: '原生系统级通知，触达率高，不遗漏', scenario: '重要价格异动时第一时间通知' },
    { feature: '股价浮窗', advantage: '无需切换APP，聊天间隙快速瞄一眼', scenario: '上班/开会时隐蔽盯盘' },
    { feature: '个股/榜单分享', advantage: '小程序卡片直达，讨论更直观', scenario: '微信群里分享讨论个股' },
    { feature: '问元宝AI', advantage: '大白话解读行情，小白也能看懂', scenario: '遇到看不懂的概念时快速了解' },
  ],
  // 黑榜痛点（竞品对比）
  blackListPainPoints: [
    { issue: '独立APP下载', pain: '注册繁琐、占用内存、不常用时还得卸载' },
    { issue: '信息过载', pain: '界面复杂，找个功能要找半天' },
    { issue: '通知轰炸', pain: '频繁推送，反而造成信息焦虑' },
    { issue: '分享不方便', pain: '只能截图，模糊不专业' },
  ],
};

// ==================== 生成Prompt的工厂函数 ====================

export function buildScenarioPrompt(params: {
  topicType: TopicType;
  keywords?: string;
  deepAnalysis?: boolean;
  selectedTitle?: string;
  personaType?: string;
  hotTopicInfo?: string;
  hotTop3Tags?: string[];
}): string {
  const { topicType, keywords, deepAnalysis, selectedTitle, personaType, hotTopicInfo, hotTop3Tags } = params;
  
  const scenario = SCENARIO_PROMPTS[topicType];
  const isDeepAnalysis = deepAnalysis === true;
  
  // 构建基础Prompt
  let prompt = `【小红书爆款内容生成】

## 场景识别
${scenario.topicType === 'market_hot' ? '[场景触发：市场热点分析]' : ''}
${scenario.topicType === 'beginner_guide' ? '[场景触发：小白与科普篇]' : ''}
${scenario.topicType === 'tool_review' ? '[场景触发：效率与工具测评]' : ''}
${scenario.topicType === 'life_lifestyle' ? '[场景触发：职场与生活场景化种草]' : ''}

## 人设信息
${personaType ? `创作者人设：${personaType}` : '通用人设'}

## 选题信息
${keywords ? `核心关键词：${keywords}` : ''}
${hotTopicInfo ? `热点背景：\n${hotTopicInfo}` : ''}
${hotTop3Tags?.length ? `热门标签：${hotTop3Tags.join('、')}` : ''}
${selectedTitle ? `指定标题：${selectedTitle}` : ''}

## 【必须遵循的内容框架】

### 1. Hook设计
${scenario.hook}

### 2. 逻辑骨架
${scenario.logicFramework}

### 3. 业务植入（必须自然融入内容）
${scenario.businessInsert}

### 4. 行动引导
${scenario.actionGuide}

${isDeepAnalysis && scenario.deepAnalysisConfig ? `## 【深度分析模式 - 必须执行】

### 宏观定调（核心原因）
${scenario.deepAnalysisConfig.macroAnalysis}

### 微观拆解（资金与板块）
${scenario.deepAnalysisConfig.microAnalysis}

### 合规化展望
${scenario.deepAnalysisConfig.complianceOutlook}
` : ''}

## 【强制合规要求】
1. **投资有风险，入市需谨慎** - 所有内容必须包含此风险提示
2. **结尾引导** - 必须引导用户"微信搜索微证券"
3. **严禁承诺收益** - 禁止"稳赚"、"翻倍"、"必涨"等词汇
4. **去荐股化** - 不给"买入/卖出"指令，改为"关注行业逻辑"
5. **理性分析** - 避免制造FOMO焦虑

## 【输出格式】
生成小红书风格内容，包括：
1. 吸引眼球的标题
2. 引人入胜的开头
3. 干货满满的主体
4. 总结升华
5. 风险提示（必须）
6. 引导关注（必须：微信搜索微证券）

要求：
- 语言生动有趣，符合小红书风格
- 结构清晰，段落分明
- 适当使用emoji增加趣味性
- 字数在800-1500字之间
- 必须包含相关标签建议`;

  return prompt;
}

// ==================== 工具测评专属内容 ====================

export function buildToolReviewContent(persona: string): string {
  const redFeatures = TOOL_REVIEW_DEEP_CONTENT.redListFeatures
    .map(f => `- **${f.feature}**：${f.advantage}\n  适用场景：${f.scenario}`)
    .join('\n');
    
  const blackPainPoints = TOOL_REVIEW_DEEP_CONTENT.blackListPainPoints
    .map(p => `- **${p.issue}**：${p.pain}`)
    .join('\n');

  return `## 微证券功能测评（深度版）

### 【红榜功能】值得推荐
${redFeatures}

### 【黑榜痛点】竞品对比
${blackPainPoints}

### 【场景化使用指南】

#### 场景1：打工人摸鱼
- PC端浮窗：聊天、开会、办公间隙随时下拉即看
- 隐蔽性强：老板以为在回微信，实际在看行情

#### 场景2：微信群社交
- 小程序一键分享：个股榜单、热门话题直接转到群聊
- 讨论更丝滑：不用截图，直接卡片形式分享

#### 场景3：碎片化时间
- 等电梯、挤地铁时：下拉微信搜一搜，10秒看清今日收益
- 不用等待APP加载：即点即看

### 【竞品横评】

| 功能 | 微证券 | 传统券商APP | 第三方平台 |
|------|--------|-------------|------------|
| 下载门槛 | 无（微信直达） | 需下载注册 | 需下载注册 |
| 浮窗功能 | 支持 | 部分支持 | 不支持 |
| 微信提醒 | 原生通知 | 需开启权限 | 依赖第三方 |
| 分享便捷度 | 一键小程序 | 只能截图 | 只能截图 |
| 界面复杂度 | 极简清爽 | 复杂冗余 | 中等 |

### 【总结】
微证券的核心优势 = **微信原生 + 轻量便捷 + 及时通知**
适合人群：职场人士、社交达人、碎片化投资者`;
}

// ==================== 生活化种草专属内容 ====================

export const LIFESTYLE_SCENARIOS = {
  officeSlacking: {
    title: '打工人隐蔽摸鱼理财法',
    hook: '同事都在聊牛市，打工人的隐蔽摸鱼理财法',
    painPoints: [
      '上班时间盯盘怕被老板发现',
      '开会时错过重要行情变化',
      '频繁切换APP太明显',
      '截图分享个股太模糊不专业'
    ],
    solution: 'PC端/手机端双端浮窗，无需切换窗口，下拉即可快速盯盘，极度隐蔽',
    keywords: ['隐蔽', '丝滑', '顺便', '摸鱼', '职场理财']
  },
  wechatSocial: {
    title: '微信群里的财富密码',
    hook: '别再发模糊的股票截图了',
    painPoints: [
      '群里讨论个股只能发截图',
      '截图模糊看不清具体数据',
      '来回切换APP太麻烦',
      '分享股票信息不够直观'
    ],
    solution: '小程序一键分享，个股榜单、热门话题可直接转到群聊，讨论更丝滑',
    keywords: ['一键分享', '小程序卡片', '群聊', '讨论', '丝滑']
  },
  fragmentedTime: {
    title: '等电梯的10秒看清收益',
    hook: '等电梯、挤地铁，10秒钟看清今日收益',
    painPoints: [
      '等电梯时想看行情',
      '地铁里信号不好APP加载慢',
      '不想特意打开APP',
      '碎片时间利用不起来'
    ],
    solution: '微信搜索直达，不用等待APP加载，下拉搜一搜，即点即看',
    keywords: ['碎片时间', '微信搜索', '即点即用', '轻量']
  }
};
