'use client';

import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { 
  Sparkles, RefreshCw, Copy, Download, ImageIcon, 
  FileText, Video, TrendingUp, Loader2, Heart, Hash,
  AlertTriangle, Check, ChevronDown, ChevronUp, Settings2,
  Flame, X, Edit3, Save, Wand2, Lock, Unlock, History,
  Trash2, FileEdit, Lightbulb, Target, Layers, Star,
  ImagePlus, Music, User, ShieldAlert, Users, MessageSquare,
  Smile, WandSparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  TopicType, UserTag, ContentType, VideoDuration, VideoStyle,
  TitleStyle, HotTopicTimeRange, AdditionalRequirement, PersonaType,
  TitleCandidate, HotTopic, HistoryRecord, EngagementScore,
  AnalysisTarget, ContentDepth, FocusDirection, ContentSubType
} from '@/lib/types';
import { 
  TOPIC_TYPE_OPTIONS, USER_TAG_OPTIONS, CONTENT_TYPE_OPTIONS,
  HOT_TOPIC_TIME_RANGE_OPTIONS, TITLE_STYLE_OPTIONS, PERSONA_OPTIONS,
  ADDITIONAL_REQUIREMENT_OPTIONS, VIDEO_DURATION_OPTIONS, VIDEO_STYLE_OPTIONS,
  USER_TAG_TOPIC_COMPATIBILITY, SHOW_HOT_TOPICS_TOPIC, TOPIC_RECOMMENDATIONS,
  ANALYSIS_TARGET_OPTIONS, CONTENT_DEPTH_OPTIONS, FOCUS_DIRECTION_OPTIONS,
  CONTENT_SUBTYPE_OPTIONS
} from '@/lib/constants';

export default function Home() {
  // ==================== 基础参数 ====================
  const [topicType, setTopicType] = useState<TopicType>('market_hot');
  const [userTag, setUserTag] = useState<UserTag>('newbie');
  const [contentType, setContentType] = useState<ContentType>('article');
  const [keywords, setKeywords] = useState('');

  // ==================== 动态配置 ====================
  const [analysisTarget, setAnalysisTarget] = useState<AnalysisTarget>('market_event');
  const [analysisTargetInput, setAnalysisTargetInput] = useState('');
  const [contentDepth, setContentDepth] = useState<ContentDepth>('logical');
  const [focusDirections, setFocusDirections] = useState<FocusDirection[]>(['why_happen', 'what_impact']);
  const [contentSubType, setContentSubType] = useState<ContentSubType>('beginner_start');
  const [platformCompare, setPlatformCompare] = useState('');
  const [includeExample, setIncludeExample] = useState(true);
  const [includeResearch, setIncludeResearch] = useState(false);

  // ==================== 内容设置 ====================
  const [videoDuration, setVideoDuration] = useState<VideoDuration>('60s');
  const [videoStyle, setVideoStyle] = useState<VideoStyle>('popular_science');
  const [customVideoStyle, setCustomVideoStyle] = useState('');
  const [enableImageSuggestion, setEnableImageSuggestion] = useState(true);

  // ==================== 高级参数 ====================
  const [titleStyles, setTitleStyles] = useState<TitleStyle[]>([]);
  const [customTitleStyle, setCustomTitleStyle] = useState('');
  const [personaType, setPersonaType] = useState<PersonaType>('veteran_trader');
  const [customPersona, setCustomPersona] = useState('');
  const [additionalRequirements, setAdditionalRequirements] = useState<AdditionalRequirement[]>([]);
  const [customRequirement, setCustomRequirement] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // ==================== 热榜数据 ====================
  const [hotTopics, setHotTopics] = useState<HotTopic[]>([]);
  const [hotTopicsLoading, setHotTopicsLoading] = useState(false);
  const [selectedHotTopic, setSelectedHotTopic] = useState<HotTopic | null>(null);
  const [hotCategory, setHotCategory] = useState<string>('finance');
  const [hotUpdateTime, setHotUpdateTime] = useState<string>('');
  const [hotTop3Tags, setHotTop3Tags] = useState<string[]>([]); // 热点Top3标签（线性接入）
  const [filterSensitive, setFilterSensitive] = useState(true); // 过滤敏感内容（数字货币等）
  
  // 热点板块配置 - 敏感板块标记
  const HOT_CATEGORIES = [
    { id: 'finance', name: '财经热搜', icon: '📈', sensitive: false },
    { id: 'tech', name: '科技前沿', icon: '🚀', sensitive: false },
    { id: 'crypto', name: '数字货币', icon: '₿', sensitive: true },
    { id: 'global', name: '环球财经', icon: '🌍', sensitive: false },
  ];

  // ==================== 历史记录 ====================
  const [historyRecords, setHistoryRecords] = useState<HistoryRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // ==================== UI状态 ====================
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState('');
  const [viewMode, setViewMode] = useState<'integrated' | 'split'>('split'); // 默认拆分视图
  const [isEditing, setIsEditing] = useState(false);
  const [lockedModules, setLockedModules] = useState<Set<'title' | 'content' | 'tags'>>(new Set());
  const [userEdited, setUserEdited] = useState(false); // 标记用户是否手动编辑过
  const [showGuide, setShowGuide] = useState(true); // 显示引导提示
  const [showComplianceFirstTime, setShowComplianceFirstTime] = useState(true); // 合规提示首次显示
  const [hideComplianceForever, setHideComplianceForever] = useState(false); // 不再提示合规
  const [currentSceneStep, setCurrentSceneStep] = useState(1); // 漏斗式场景流当前步骤 (1-3)
  const [analysisLogic, setAnalysisLogic] = useState<string>('why_happen'); // 分析逻辑选择
  const [toneStyle, setToneStyle] = useState<string>('casual'); // 语气风格
  const [emojiDensity, setEmojiDensity] = useState<string>('medium'); // 表情包密度
  const [enableRiskWarning, setEnableRiskWarning] = useState(true); // 风险提示开关（默认开启）
  const [titleStyle, setTitleStyle] = useState<string>('suspense'); // 标题风格
  const [showTitlePreview, setShowTitlePreview] = useState(false); // 显示标题预览
  const [generatedTitles, setGeneratedTitles] = useState<string[]>([]); // 生成的标题候选
  const [selectedTitleIndex, setSelectedTitleIndex] = useState<number | null>(null); // 选中的标题索引

  // ==================== 输出状态 ====================
  const [titles, setTitles] = useState<TitleCandidate[]>([]);
  const [content, setContent] = useState('');
  const [editableContent, setEditableContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [compliance, setCompliance] = useState<{ isCompliant: boolean; warnings: string[]; fixed?: boolean }>({ isCompliant: true, warnings: [] });
  const [engagementScore, setEngagementScore] = useState<EngagementScore | null>(null);
  const [recommendedMusic, setRecommendedMusic] = useState<string[]>([]);

  // ==================== 自定义生图 ====================
  const [showCustomImageModal, setShowCustomImageModal] = useState(false);
  const [customImagePrompt, setCustomImagePrompt] = useState('');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  // ==================== 计算属性 ====================
  const isVideo = contentType === 'video_script';
  const showHotTopics = SHOW_HOT_TOPICS_TOPIC.includes(topicType);
  const topicRecommendations = TOPIC_RECOMMENDATIONS[topicType];
  const compatibleTopics = USER_TAG_TOPIC_COMPATIBILITY[userTag];

  // ==================== 初始化 ====================
  useEffect(() => {
    if (showHotTopics) {
      loadHotTopics();
    }
  }, [showHotTopics]);

  // 加载历史记录（从数据库）
  useEffect(() => {
    loadHistoryFromDB();
  }, []);

  const loadHistoryFromDB = async () => {
    try {
      const response = await fetch('/api/history');
      const data = await response.json();
      if (data.records) {
        setHistoryRecords(data.records.map((r: any) => ({
          id: r.id,
          createdAt: r.created_at,
          title: r.title,
          content: r.content,
          tags: r.tags || [],
          imageUrl: r.selected_image_url,
          imageUrls: r.image_urls || [],
          engagementScore: r.engagement_score,
          isFavorite: r.is_favorite,
        })));
      }
    } catch (error) {
      console.error('Load history error:', error);
    }
  };

  // 切换用户标签时，检查选题兼容性
  useEffect(() => {
    if (!compatibleTopics.includes(topicType)) {
      setTopicType(compatibleTopics[0]);
    }
  }, [userTag, compatibleTopics, topicType]);

  // ==================== 加载热榜 ====================
  const loadHotTopics = useCallback(async (category?: string) => {
    setHotTopicsLoading(true);
    const targetCategory = category || hotCategory;
    try {
      const response = await fetch(`/api/hot-topics?category=${targetCategory}`);
      const data = await response.json();
      setHotTopics(data.topics || []);
      setHotUpdateTime(data.updateTime || '');
      setHotTop3Tags(data.top3Tags || []); // 设置热点Top3标签
    } catch (error) {
      console.error('Load hot topics error:', error);
    } finally {
      setHotTopicsLoading(false);
    }
  }, [hotCategory]);

  // 切换热点板块
  const handleCategoryChange = (categoryId: string) => {
    setHotCategory(categoryId);
    loadHotTopics(categoryId);
  };

  // ==================== 选择热点/推荐 ====================
  const handleSelectItem = (title: string) => {
    setKeywords(title);
  };

  // ==================== 切换模块锁定 ====================
  const toggleLock = (module: 'title' | 'content' | 'tags') => {
    setLockedModules(prev => {
      const newSet = new Set(prev);
      if (newSet.has(module)) {
        newSet.delete(module);
      } else {
        newSet.add(module);
      }
      return newSet;
    });
  };

  // ==================== 切换补充要求 ====================
  const toggleAdditionalRequirement = (value: string) => {
    setAdditionalRequirements(prev =>
      prev.includes(value as AdditionalRequirement)
        ? prev.filter(r => r !== value)
        : [...prev, value as AdditionalRequirement]
    );
  };

  // ==================== 生成内容 ====================
  // 一次性生成标题和内容（边生成边显示）
  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    setShowTitlePreview(true);
    setViewMode('integrated');
    setCurrentStep('正在构思...');
    setContent(''); // 清空内容
    setTitles([]);
    setTags([]);
    setImageUrls([]);
    setEngagementScore(null);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicType, userTag, contentType, keywords,
          analysisTarget, analysisTargetInput, contentDepth, focusDirections,
          contentSubType, platformCompare, includeExample, includeResearch,
          videoDuration, videoStyle: videoStyle, enableImageSuggestion,
          titleStyles, customTitleStyle, personaType, customPersona,
          additionalRequirements: enableRiskWarning ? ['risk_warning'] : [],
          customRequirement,
          hotTopicInfo: selectedHotTopic ? `${selectedHotTopic.title}\n${selectedHotTopic.snippet}` : undefined,
          hotTop3Tags: hotTop3Tags,
          analysisLogic, toneStyle, emojiDensity, enableRiskWarning,
          // 一次性生成所有内容
          generateOnlyTitles: false,
        }),
      });

      if (!response.ok) throw new Error('生成失败');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                
                switch (data.type) {
                  case 'status':
                    setCurrentStep(data.data);
                    break;
                  case 'titles':
                    // 标题生成后立即显示
                    setGeneratedTitles(data.data.map((t: any) => t.title || t));
                    setTitles(data.data.map((t: any) => typeof t === 'string' ? { title: t, style: 'suspense' } : t));
                    if (data.data.length > 0) {
                      setSelectedTitleIndex(0);
                    }
                    // 生成标题后切换到整合视图，显示"正在生成内容..."
                    setViewMode('integrated');
                    setCurrentStep('正在生成内容...');
                    break;
                  case 'titles_end':
                    // 标题选择完成，不结束生成，继续等内容
                    break;
                  case 'content':
                    // 边生成边显示内容
                    setContent(prev => prev + data.data);
                    break;
                  case 'content_end':
                    break;
                  case 'tags':
                    setTags(data.data);
                    break;
                  case 'images':
                    setImageUrls(data.data);
                    break;
                  case 'music':
                    setRecommendedMusic(data.data);
                    break;
                  case 'compliance':
                    setCompliance(data.data);
                    if (!data.data.isCompliant && !userEdited && data.data.fixedContent) {
                      setEditableContent(data.data.fixedContent);
                      setContent(data.data.fixedContent);
                      setCompliance(prev => ({ ...prev, fixed: true }));
                    }
                    break;
                  case 'engagement_score':
                    setEngagementScore(data.data);
                    setCurrentStep('');
                    toast.success('生成完成！');
                    break;
                }
              } catch (e) {}
            }
          }
        }
        // 生成完成
        toast.success('生成完成！');
      }
    } catch (error) {
      console.error('生成错误:', error);
      toast.error('生成失败，请重试');
    } finally {
      setIsGenerating(false);
    }
  }, [topicType, userTag, contentType, keywords, selectedHotTopic, hotTop3Tags, analysisLogic, toneStyle, emojiDensity, enableRiskWarning, personaType]);

  // 选中标题并生成完整内容（分步预览第二步）
  const handleSelectTitle = useCallback((index: number) => {
    setSelectedTitleIndex(index);
  }, []);

  // 生成完整内容
  const handleGenerateFullContent = useCallback(async () => {
    if (selectedTitleIndex === null) {
      toast.error('请先选择一个标题');
      return;
    }

    setIsGenerating(true);
    setContent('');
    setTags([]);
    setImageUrls([]);
    setEngagementScore(null);
    setRecommendedMusic([]);
    setCurrentStep('准备中...');
    setUserEdited(false);
    setCompliance({ isCompliant: true, warnings: [] });
    setShowGuide(true);

    // 获取选中的标题 - 优先使用titles数组，否则使用generatedTitles
    const selectedTitleObj = titles.length > 0 
      ? titles[selectedTitleIndex]?.title 
      : generatedTitles[selectedTitleIndex];

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicType, userTag, contentType, keywords,
          analysisTarget, analysisTargetInput, contentDepth, focusDirections,
          contentSubType, platformCompare, includeExample, includeResearch,
          videoDuration, videoStyle: videoStyle, enableImageSuggestion: true,
          titleStyles, customTitleStyle, personaType, customPersona,
          additionalRequirements: enableRiskWarning ? ['risk_warning'] : [],
          customRequirement,
          hotTopicInfo: selectedHotTopic ? `${selectedHotTopic.title}\n${selectedHotTopic.snippet}` : undefined,
          hotTop3Tags: hotTop3Tags,
          // 新增参数
          analysisLogic,
          toneStyle,
          emojiDensity,
          enableRiskWarning,
          // 指定标题（使用选中的标题）
          selectedTitle: selectedTitleObj,
        }),
      });

      if (!response.ok) throw new Error('生成失败');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        let accumulatedContent = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                
                switch (data.type) {
                  case 'status':
                    setCurrentStep(data.data);
                    break;
                  case 'titles':
                    if (!lockedModules.has('title')) setTitles(data.data);
                    break;
                  case 'content':
                    if (!lockedModules.has('content')) {
                      accumulatedContent += data.data;
                      setContent(accumulatedContent);
                      setEditableContent(accumulatedContent);
                    }
                    break;
                  case 'tags':
                    if (!lockedModules.has('tags')) setTags(data.data);
                    break;
                  case 'images':
                    setImageUrls(data.data);
                    break;
                  case 'compliance':
                    setCompliance(data.data);
                    if (!data.data.isCompliant && !userEdited && data.data.fixedContent) {
                      setEditableContent(data.data.fixedContent);
                      setContent(data.data.fixedContent);
                      setCompliance(prev => ({ ...prev, fixed: true }));
                    }
                    break;
                  case 'engagement_score':
                    setEngagementScore(data.data);
                    setCurrentStep('');
                    break;
                  case 'music':
                    setRecommendedMusic(data.data);
                    break;
                }
              } catch (e) {}
            }
          }
        }
        toast.success('生成完成！请选择您喜欢的内容');
        setShowTitlePreview(false);
      }
    } catch (error) {
      console.error('生成错误:', error);
      toast.error('生成失败，请重试');
    } finally {
      setIsGenerating(false);
    }
  }, [selectedTitleIndex, generatedTitles, topicType, userTag, contentType, keywords, selectedHotTopic, hotTop3Tags, analysisLogic, toneStyle, emojiDensity, enableRiskWarning, personaType, lockedModules, userEdited]);

  // ==================== 自定义生图 ====================
  const handleCustomImageGenerate = async () => {
    if (!customImagePrompt.trim()) {
      toast.error('请输入图片描述');
      return;
    }
    
    setIsGeneratingImage(true);
    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: customImagePrompt }),
      });
      
      const data = await response.json();
      if (data.imageUrls) {
        setImageUrls(prev => [...data.imageUrls, ...prev]);
        toast.success('配图生成成功！');
        setShowCustomImageModal(false);
        setCustomImagePrompt('');
      }
    } catch (error) {
      toast.error('图片生成失败');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // ==================== 合规修正 ====================
  const handleComplianceFix = async () => {
    if (userEdited) {
      toast.info('您已手动编辑内容，请自行调整不合规部分');
      return;
    }
    
    setIsGenerating(true);
    setCurrentStep('正在修正合规问题...');
    
    try {
      const response = await fetch('/api/compliance-fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: titles[selectedTitleIndex]?.title,
          content: editableContent,
          warnings: compliance.warnings,
        }),
      });
      
      const data = await response.json();
      if (data.fixedContent) {
        setEditableContent(data.fixedContent);
        setContent(data.fixedContent);
        setCompliance({ isCompliant: true, warnings: [], fixed: true });
        toast.success('内容已自动修正');
      }
    } catch (error) {
      toast.error('修正失败');
    } finally {
      setIsGenerating(false);
      setCurrentStep('');
    }
  };

  // ==================== 保存到历史 ====================
  const handleSave = async () => {
    try {
      const response = await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: titles[selectedTitleIndex]?.title || '',
          content: editableContent,
          tags,
          imageUrls,
          imageUrl: imageUrls[selectedImageIndex],
          engagementScore: engagementScore || undefined,
        }),
      });
      
      const data = await response.json();
      if (data.record) {
        // 刷新历史记录列表
        await loadHistoryFromDB();
        toast.success('已保存到云端');
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error('保存失败');
    }
  };

  // ==================== 复制与导出 ====================
  const handleCopyForXHS = () => {
    const selectedTitle = titles[selectedTitleIndex]?.title || '';
    const text = `${selectedTitle}\n\n${editableContent}\n\n${tags.map(t => '#' + t).join(' ')}`;
    navigator.clipboard.writeText(text);
    toast.success('已复制，可直接粘贴到小红书');
  };

  const handleExport = () => {
    const selectedTitle = titles[selectedTitleIndex]?.title || '';
    let text = `【标题】${selectedTitle}\n\n【正文】\n${editableContent}\n\n【标签】\n${tags.map(t => '#' + t).join(' ')}\n\n`;
    
    if (isVideo && recommendedMusic.length > 0) {
      text += `【推荐音乐】\n${recommendedMusic.join('\n')}\n\n`;
    }
    
    if (engagementScore) {
      text += `【种草力评分】${engagementScore.score}/10分`;
    }
    
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `小红书内容_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('已导出');
  };

  // ==================== 历史记录操作 ====================
  const handleLoadHistory = (record: HistoryRecord) => {
    setTitles([{ title: record.title, style: 'suspense' }]);
    setSelectedTitleIndex(0);
    setContent(record.content);
    setEditableContent(record.content);
    setTags(record.tags);
    if (record.imageUrls?.length) setImageUrls(record.imageUrls);
    setEngagementScore(record.engagementScore || null);
    setShowHistory(false);
    setUserEdited(true); // 加载历史视为用户编辑
    toast.success('已加载历史记录');
  };

  const handleDeleteHistory = async (id: string) => {
    try {
      const response = await fetch(`/api/history?id=${id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        await loadHistoryFromDB();
        toast.success('已删除');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('删除失败');
    }
  };

  // ==================== 内容编辑处理 ====================
  const handleContentEdit = (value: string) => {
    setEditableContent(value);
    setUserEdited(true);
  };

  // ==================== 整合内容 ====================
  const handleIntegrate = () => {
    setViewMode('integrated');
    setShowGuide(false);
    toast.success('已整合内容，可以一键复制');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-orange-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-6">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2.5 bg-gradient-to-br from-rose-500 to-pink-500 rounded-lg sm:rounded-xl shadow-lg">
              <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg md:text-xl font-bold bg-gradient-to-r from-rose-600 to-orange-500 bg-clip-text text-transparent">
                小红书AI爆款内容生成器
              </h1>
              <p className="text-gray-500 text-[10px] sm:text-xs hidden sm:block">智能生成专业、深度的财经内容</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowHistory(true)} className="gap-1 sm:gap-2 h-8 sm:h-9 px-2 sm:px-3">
            <History className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">历史记录</span>
            {historyRecords.length > 0 && (
              <Badge variant="secondary" className="ml-0 sm:ml-1 text-[10px]">{historyRecords.length}</Badge>
            )}
          </Button>
        </div>

        {/* ==================== 漏斗式场景流（线性化交互）==================== */}
        {/* 场景流进度指示器 */}
        <Card className="border-0 shadow-lg bg-white/90 mb-3">
          <CardContent className="px-4 py-3">
            <div className="flex items-center justify-between">
              {/* 步骤指示器 */}
              <div className="flex items-center gap-2 flex-1">
                {['身份与场景', '核心关键词', '生成内容'].map((step, index) => {
                  const stepNum = index + 1;
                  const isActive = currentSceneStep >= stepNum;
                  const isCurrent = currentSceneStep === stepNum;
                  return (
                    <div key={step} className="flex items-center gap-1.5">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        isActive 
                          ? 'bg-gradient-to-br from-rose-500 to-pink-500 text-white' 
                          : 'bg-gray-200 text-gray-400'
                      }`}>
                        {isActive && currentSceneStep > stepNum ? '✓' : stepNum}
                      </div>
                      <span className={`text-xs font-medium hidden sm:block ${
                        isCurrent ? 'text-rose-600' : isActive ? 'text-gray-600' : 'text-gray-400'
                      }`}>
                        {step}
                      </span>
                      {index < 2 && (
                        <div className={`h-0.5 flex-1 min-w-[20px] rounded-full ${
                          currentSceneStep > stepNum ? 'bg-rose-400' : 'bg-gray-200'
                        }`} />
                      )}
                    </div>
                  );
                })}
              </div>
              {/* 跳过高级选项提示 */}
              {userTag === 'newbie' && (
                <span className="text-[10px] text-gray-400 hidden md:block">
                  已为您智能预设配置 ✨
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 md:gap-5">
          {/* ==================== 左侧：输入区域（漏斗式场景流） ==================== */}
          <div className="lg:col-span-5 space-y-3 sm:space-y-4">
            
            {/* ==================== Step 1: 身份与场景选择 ==================== */}
            {currentSceneStep === 1 && (
              <Card className="border-0 shadow-lg bg-white/90">
                <CardHeader className="pb-2 pt-4 px-5">
                  <CardTitle className="text-base font-bold text-gray-800 flex items-center gap-2">
                    <span className="w-7 h-7 rounded-full bg-gradient-to-br from-rose-500 to-pink-500 text-white text-sm flex items-center justify-center">1</span>
                    Who & Why
                    <span className="text-xs font-normal text-gray-400 ml-1">确定目标用户与内容场景</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-5 space-y-5">
                  
                  {/* 目标用户选择 */}
                  <div>
                    <Label className="text-xs text-gray-500 mb-2 block flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      我要写给谁？
                    </Label>
                    <div className="grid grid-cols-3 gap-2">
                      {USER_TAG_OPTIONS.map(opt => {
                        const icons: Record<string, string> = {
                          newbie: '🌱',
                          active_trader: '📊',
                          professional: '🎯'
                        };
                        const descriptions: Record<string, string> = {
                          newbie: '投资小白',
                          active_trader: '有经验的投资者',
                          professional: '资深专业投资者'
                        };
                        return (
                          <button
                            key={opt.value}
                            onClick={() => {
                              setUserTag(opt.value);
                              // 自动设置默认值
                              if (opt.value === 'newbie') {
                                setPersonaType('friendly_senior');
                                setContentType('article');
                                setTopicType('beginner_guide');
                              } else if (opt.value === 'active_trader') {
                                setPersonaType('market_analyst');
                                setContentType('article');
                              }
                            }}
                            className={`p-3 rounded-xl text-center transition-all ${
                              userTag === opt.value
                                ? 'bg-gradient-to-br from-rose-500 to-pink-500 text-white shadow-md ring-2 ring-rose-300'
                                : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                            }`}
                          >
                            <span className="text-xl mb-1 block">{icons[opt.value]}</span>
                            <span className="text-xs font-medium block">{opt.label}</span>
                            <span className={`text-[10px] block mt-0.5 ${
                              userTag === opt.value ? 'text-rose-100' : 'text-gray-400'
                            }`}>
                              {descriptions[opt.value]}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 选题类型选择 */}
                  <div>
                    <Label className="text-xs text-gray-500 mb-2 block flex items-center gap-1.5">
                      <Target className="h-3.5 w-3.5" />
                      写什么类型的内容？
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      {TOPIC_TYPE_OPTIONS.filter(opt => {
                        const isCompatible = compatibleTopics.includes(opt.value);
                        if (userTag === 'newbie') {
                          return ['beginner_guide', 'market_hot'].includes(opt.value);
                        }
                        return isCompatible;
                      }).map(opt => {
                        const isCompatible = userTag === 'newbie' 
                          ? ['beginner_guide', 'market_hot'].includes(opt.value)
                          : compatibleTopics.includes(opt.value);
                        return (
                          <button
                            key={opt.value}
                            onClick={() => isCompatible && setTopicType(opt.value)}
                            disabled={!isCompatible}
                            className={`p-3 rounded-xl text-left transition-all ${
                              topicType === opt.value
                                ? 'bg-rose-50 border-2 border-rose-400'
                                : isCompatible
                                  ? 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                                  : 'bg-gray-50 opacity-50 cursor-not-allowed'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-lg">{opt.icon}</span>
                              <span className="text-xs font-medium text-gray-800">{opt.label}</span>
                            </div>
                            <p className="text-[10px] text-gray-400 line-clamp-2">{opt.description}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 内容形式 */}
                  <div>
                    <Label className="text-xs text-gray-500 mb-2 block flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5" />
                      选择输出形式
                    </Label>
                    <div className="flex gap-2">
                      {CONTENT_TYPE_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => setContentType(opt.value)}
                          className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
                            contentType === opt.value
                              ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          <span>{opt.icon}</span>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 下一步按钮 */}
                  <Button 
                    onClick={() => setCurrentSceneStep(2)}
                    className="w-full h-11 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600"
                  >
                    下一步：选择关键词 →
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* ==================== Step 2: 主题与逻辑（整合分析配置）==================== */}
            {currentSceneStep === 2 && (
              <Card className="border-0 shadow-lg bg-white/90">
                <CardHeader className="pb-2 pt-4 px-5">
                  <CardTitle className="text-base font-bold text-gray-800 flex items-center gap-2">
                    <span className="w-7 h-7 rounded-full bg-gradient-to-br from-rose-500 to-pink-500 text-white text-sm flex items-center justify-center">2</span>
                    主题与逻辑
                    <span className="text-xs font-normal text-gray-400 ml-1">确定内容骨架</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-5 space-y-4">
                  
                  {/* 已选主题回顾 */}
                  <div className="p-3 bg-gradient-to-r from-rose-50 to-pink-50 rounded-xl border border-rose-100">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="px-2 py-0.5 bg-rose-500 text-white rounded-full text-[10px] font-medium">
                        {USER_TAG_OPTIONS.find(o => o.value === userTag)?.label}
                      </span>
                      <span className="text-gray-400">→</span>
                      <span className="px-2 py-0.5 bg-pink-500 text-white rounded-full text-[10px] font-medium">
                        {TOPIC_TYPE_OPTIONS.find(o => o.value === topicType)?.label}
                      </span>
                      {keywords && (
                        <>
                          <span className="text-gray-400">→</span>
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-[10px] font-medium">
                            {keywords}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* 子类型推荐标签（MECE化） */}
                  {topicType === 'beginner_guide' && (
                    <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Lightbulb className="h-3.5 w-3.5 text-green-600" />
                        <span className="text-xs font-medium text-green-700">推荐切入点</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {['ETF基金', '理财认知', '基金定投', '国债', '货币基金', '可转债'].map(tag => (
                          <button
                            key={tag}
                            onClick={() => setKeywords(tag)}
                            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                              keywords === tag
                                ? 'bg-green-500 text-white'
                                : 'bg-white text-green-700 border border-green-200 hover:bg-green-100'
                            }`}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {topicType === 'advanced_invest' && (
                    <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Lightbulb className="h-3.5 w-3.5 text-blue-600" />
                        <span className="text-xs font-medium text-blue-700">推荐切入点</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {['技术分析', '波段操作', '仓位管理', '止损策略', '财报解读', '行业研报'].map(tag => (
                          <button
                            key={tag}
                            onClick={() => setKeywords(tag)}
                            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                              keywords === tag
                                ? 'bg-blue-500 text-white'
                                : 'bg-white text-blue-700 border border-blue-200 hover:bg-blue-100'
                            }`}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {topicType === 'professional_analysis' && (
                    <div className="p-3 bg-gradient-to-r from-purple-50 to-violet-50 rounded-xl border border-purple-200">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Lightbulb className="h-3.5 w-3.5 text-purple-600" />
                        <span className="text-xs font-medium text-purple-700">推荐切入点</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {['宏观分析', '行业周期', '估值体系', '财报深读', '风险定价', '配置策略'].map(tag => (
                          <button
                            key={tag}
                            onClick={() => setKeywords(tag)}
                            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                              keywords === tag
                                ? 'bg-purple-500 text-white'
                                : 'bg-white text-purple-700 border border-purple-200 hover:bg-purple-100'
                            }`}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 推荐主题（当不是市场热点且有推荐主题时显示） */}
                  {!showHotTopics && topicRecommendations.length > 0 && (
                    <div className="p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Lightbulb className="h-3.5 w-3.5 text-amber-600" />
                        <span className="text-xs font-medium text-amber-700">推荐主题</span>
                      </div>
                      <div className="space-y-1.5">
                        {topicRecommendations.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => handleSelectItem(item.title)}
                            className={`w-full p-2 rounded-lg text-left transition-all ${
                              keywords === item.title
                                ? 'bg-amber-50 border border-amber-200'
                                : 'bg-white hover:bg-amber-50 border border-transparent'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <p className="text-xs text-gray-700">{item.title}</p>
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{item.category}</Badge>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 关键词输入 */}
                  <div>
                    <Label className="text-xs text-gray-500 mb-1.5 block">
                      核心关键词 {keywords && <span className="text-rose-500">(已选: {keywords})</span>}
                    </Label>
                    <Input
                      placeholder="可输入或选择上方推荐"
                      value={keywords}
                      onChange={(e) => setKeywords(e.target.value)}
                      className="h-10"
                    />
                  </div>

                  {/* 动态显示：市场热点热搜 */}
                  {topicType === 'market_hot' && (
                    <div className="animate-in slide-in-from-top-2 duration-300">
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-xs text-gray-500 flex items-center gap-1.5">
                          <Flame className="h-3.5 w-3.5 text-orange-500" />
                          实时热搜（点击即可选择）
                        </Label>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 w-6 p-0" 
                          onClick={() => loadHotTopics()}
                          disabled={hotTopicsLoading}
                        >
                          <RefreshCw className={`h-3 w-3 ${hotTopicsLoading ? 'animate-spin' : ''}`} />
                        </Button>
                      </div>
                      
                      {/* 热点Top3标签 */}
                      {hotTop3Tags.length > 0 && (
                        <div className="mb-2 p-2 bg-gradient-to-r from-orange-50 to-rose-50 rounded-lg border border-orange-100">
                          <div className="flex items-center gap-1 mb-1">
                            <Sparkles className="h-3 w-3 text-orange-500" />
                            <span className="text-[10px] text-orange-600 font-medium">🔥 热点Top3</span>
                          </div>
                          <div className="flex gap-1.5">
                            {hotTop3Tags.map((tag, index) => (
                              <button
                                key={index}
                                onClick={() => setKeywords(tag)}
                                className={`px-2 py-1 rounded-full text-xs font-medium transition-all ${
                                  keywords === tag
                                    ? 'bg-gradient-to-r from-orange-500 to-rose-500 text-white'
                                    : 'bg-white text-gray-700 border border-gray-200 hover:border-orange-300'
                                }`}
                              >
                                {tag}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* 热搜列表 */}
                      {hotTopicsLoading && hotTopics.length === 0 ? (
                        <div className="flex items-center justify-center py-4 text-gray-400 text-sm">
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          加载中...
                        </div>
                      ) : (
                        <div className="space-y-1 max-h-48 overflow-y-auto">
                          {hotTopics.slice(0, 6).map((topic, index) => (
                            <button
                              key={topic.id}
                              onClick={() => handleSelectItem(topic.title)}
                              className={`w-full p-2 rounded-lg text-left transition-all ${
                                keywords === topic.title
                                  ? 'bg-orange-50 border border-orange-200'
                                  : 'bg-gray-50 hover:bg-gray-100'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className={`w-5 h-5 rounded-lg text-[10px] flex items-center justify-center font-bold ${
                                  index < 3 ? 'bg-orange-400 text-white' : 'bg-gray-200 text-gray-600'
                                }`}>
                                  {index + 1}
                                </span>
                                <p className="text-xs text-gray-700 line-clamp-1 flex-1">{topic.title}</p>
                                <span className="text-[10px] text-gray-400">{topic.source}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 分析逻辑选择（整合分析配置） */}
                  <div>
                    <Label className="text-xs text-gray-500 mb-2 block flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5" />
                      分析逻辑（内容的骨架）
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { value: 'why_happen', label: '为什么发生', icon: '❓', desc: '原因分析+背景解读' },
                        { value: 'market_view', label: '市场怎么看', icon: '📊', desc: '行情解读+趋势判断' },
                        { value: 'how_to_do', label: '怎么操作', icon: '🎯', desc: '实操策略+买入卖出' },
                        { value: 'deep_analysis', label: '深度解读', icon: '🔍', desc: '数据支撑+研报引用' },
                      ].map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => setAnalysisLogic(opt.value as any)}
                          className={`p-3 rounded-xl text-left transition-all ${
                            analysisLogic === opt.value
                              ? 'bg-rose-50 border-2 border-rose-400'
                              : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">{opt.icon}</span>
                            <span className="text-xs font-medium text-gray-800">{opt.label}</span>
                          </div>
                          <p className="text-[10px] text-gray-400">{opt.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 内容设置 */}
                  <div>
                    <Label className="text-xs text-gray-500 mb-2 block flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5" />
                      内容设置
                    </Label>
                    
                    {/* 视频时长（仅视频脚本显示） */}
                    {contentType === 'video_script' && (
                      <div className="mb-3">
                        <Label className="text-[10px] text-gray-400 mb-1 block">视频时长</Label>
                        <div className="flex gap-1.5">
                          {['15s', '30s', '60s', '90s'].map(duration => (
                            <button
                              key={duration}
                              onClick={() => setVideoDuration(duration as any)}
                              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                videoDuration === duration
                                  ? 'bg-rose-500 text-white'
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              {duration}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 视频风格 */}
                    {contentType === 'video_script' && (
                      <div className="mb-3">
                        <Label className="text-[10px] text-gray-400 mb-1 block">视频风格</Label>
                        <select
                          value={videoStyle}
                          onChange={(e) => setVideoStyle(e.target.value)}
                          className="w-full h-9 px-3 rounded-lg border border-gray-200 text-xs bg-white"
                        >
                          <option value="science">科普风格</option>
                          <option value="humor">幽默风格</option>
                          <option value="serious">严谨风格</option>
                          <option value="trendy">潮流风格</option>
                        </select>
                      </div>
                    )}

                    {/* 参考配图 */}
                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <div>
                        <span className="text-xs text-gray-600 flex items-center gap-1.5">
                          <ImageIcon className="h-3.5 w-3.5" />
                          参考配图
                        </span>
                        <p className="text-[10px] text-gray-400 mt-0.5">生成内容时附带配图</p>
                      </div>
                      <Switch
                        checked={enableImageSuggestion}
                        onCheckedChange={setEnableImageSuggestion}
                      />
                    </div>
                  </div>

                  {/* 上一步 + 下一步 */}
                  <div className="flex gap-2 pt-2">
                    <Button 
                      variant="outline"
                      onClick={() => setCurrentSceneStep(1)}
                      className="flex-1"
                    >
                      ← 上一步
                    </Button>
                    <Button 
                      onClick={() => setCurrentSceneStep(3)}
                      disabled={!keywords && !selectedHotTopic}
                      className="flex-1 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600"
                    >
                      下一步：风格设置 →
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ==================== Step 3: 风格与润色（整合高级设置）==================== */}
            {currentSceneStep === 3 && (
              <Card className="border-0 shadow-lg bg-white/90">
                <CardHeader className="pb-2 pt-4 px-5">
                  <CardTitle className="text-base font-bold text-gray-800 flex items-center gap-2">
                    <span className="w-7 h-7 rounded-full bg-gradient-to-br from-rose-500 to-pink-500 text-white text-sm flex items-center justify-center">3</span>
                    风格与润色
                    <span className="text-xs font-normal text-gray-400 ml-1">内容的皮肤</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-5 space-y-4">
                  
                  {/* 人设库选择 */}
                  <div>
                    <Label className="text-xs text-gray-500 mb-2 block flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5" />
                      人设风格
                    </Label>
                    <div className="grid grid-cols-3 gap-2">
                      {PERSONA_OPTIONS.map(p => (
                        <button
                          key={p.value}
                          onClick={() => setPersonaType(p.value)}
                          className={`p-2 rounded-xl text-center transition-all ${
                            personaType === p.value
                              ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          <div className="text-xs font-medium">{p.label}</div>
                        </button>
                      ))}
                    </div>
                    {personaType === 'custom' && (
                      <Input
                        placeholder="描述你的人设风格..."
                        value={customPersona}
                        onChange={(e) => setCustomPersona(e.target.value)}
                        className="h-9 mt-2 text-xs"
                      />
                    )}
                  </div>

                  {/* 语气词密度 */}
                  <div>
                    <Label className="text-xs text-gray-500 mb-2 block flex items-center gap-1.5">
                      <MessageSquare className="h-3.5 w-3.5" />
                      语气风格
                    </Label>
                    <div className="flex gap-2">
                      {[
                        { value: 'casual', label: '轻松日常', icon: '😊', desc: '姐妹们、超好用' },
                        { value: 'professional', label: '专业严谨', icon: '📋', desc: '数据说话、逻辑严密' },
                        { value: 'enthusiastic', label: '热情洋溢', icon: '🔥', desc: '太牛了、绝绝子' },
                      ].map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => setToneStyle(opt.value as any)}
                          className={`flex-1 p-2 rounded-xl text-center transition-all ${
                            toneStyle === opt.value
                              ? 'bg-rose-50 border-2 border-rose-400'
                              : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                          }`}
                        >
                          <span className="text-lg block mb-0.5">{opt.icon}</span>
                          <span className="text-[10px] font-medium text-gray-700 block">{opt.label}</span>
                          <span className="text-[9px] text-gray-400 block mt-0.5 hidden sm:block">{opt.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 表情包密度 */}
                  <div>
                    <Label className="text-xs text-gray-500 mb-2 block flex items-center gap-1.5">
                      <Smile className="h-3.5 w-3.5" />
                      表情包密度
                    </Label>
                    <div className="flex gap-2">
                      {[
                        { value: 'low', label: '少', desc: '1-2个', emoji: '🙂' },
                        { value: 'medium', label: '适中', desc: '3-5个', emoji: '😊' },
                        { value: 'high', label: '多', desc: '5个以上', emoji: '🤩' },
                      ].map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => setEmojiDensity(opt.value as any)}
                          className={`flex-1 py-2 rounded-xl text-center transition-all ${
                            emojiDensity === opt.value
                              ? 'bg-rose-500 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          <span className="text-lg block">{opt.emoji}</span>
                          <span className="text-[10px] font-medium">{opt.label}</span>
                          <span className="text-[9px] opacity-70">{opt.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 标题风格 */}
                  <div>
                    <Label className="text-xs text-gray-500 mb-2 block flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5" />
                      标题风格
                    </Label>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { value: 'suspense', label: '悬念式', icon: '🤔' },
                        { value: 'data', label: '数据式', icon: '📊' },
                        { value: 'emotional', label: '情感式', icon: '❤️' },
                        { value: 'practical', label: '实用式', icon: '💡' },
                        { value: 'contrast', label: '反差式', icon: '⚡' },
                        { value: 'custom', label: '自定义', icon: '✏️' },
                      ].map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => setTitleStyle(opt.value as any)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                            titleStyle === opt.value
                              ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          <span className="mr-1">{opt.icon}</span>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    {/* 自定义标题风格输入 */}
                    {titleStyle === 'custom' && (
                      <Input
                        placeholder="输入自定义标题风格要求..."
                        value={customTitleStyle || ''}
                        onChange={(e) => setCustomTitleStyle(e.target.value)}
                        className="mt-2 h-9"
                      />
                    )}
                  </div>

                  {/* 补充要求 */}
                  <div>
                    <Label className="text-xs text-gray-500 mb-2 block flex items-center gap-1.5">
                      <FileEdit className="h-3.5 w-3.5" />
                      补充要求
                    </Label>
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { value: 'short_300', label: '控制在300字', icon: '📝' },
                          { value: 'short_term', label: '侧重短期分析', icon: '⚡' },
                          { value: 'long_term', label: '侧重长期价值', icon: '🏆' },
                          { value: 'examples', label: '举例说明', icon: '📖' },
                        ].map(opt => (
                          <button
                            key={opt.value}
                            onClick={() => toggleAdditionalRequirement(opt.value)}
                            className={`px-2.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                              additionalRequirements.includes(opt.value as AdditionalRequirement)
                                ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            <span className="mr-1">{opt.icon}</span>
                            {opt.label}
                          </button>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { value: 'story_telling', label: '故事化表达', icon: '📚' },
                          { value: 'risk_warning', label: '加风险提示', icon: '⚠️' },
                          { value: 'recommend_wzq', label: '推荐微证券', icon: '💰' },
                          { value: 'custom', label: '自定义', icon: '✏️' },
                        ].map(opt => (
                          <button
                            key={opt.value}
                            onClick={() => toggleAdditionalRequirement(opt.value)}
                            className={`px-2.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                              additionalRequirements.includes(opt.value as AdditionalRequirement)
                                ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            <span className="mr-1">{opt.icon}</span>
                            {opt.label}
                          </button>
                        ))}
                        {/* 自定义补充要求输入框 */}
                        {additionalRequirements.includes('custom' as AdditionalRequirement) && (
                          <Input
                            placeholder="输入自定义补充要求..."
                            value={customRequirement || ''}
                            onChange={(e) => setCustomRequirement(e.target.value)}
                            className="mt-2 h-9"
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 生成按钮 - 直接生成内容 */}
                  <Button 
                    onClick={handleGenerate}
                    disabled={isGenerating || (!keywords && !selectedHotTopic)}
                    className="w-full h-12 bg-gradient-to-r from-rose-500 via-pink-500 to-orange-500 hover:from-rose-600 hover:via-pink-600 hover:to-orange-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        {currentStep || '生成中...'}
                      </>
                    ) : (
                      <>
                        <Wand2 className="h-4 w-4 mr-2" />
                        一键生成爆款内容 ✨
                      </>
                    )}
                  </Button>

                  {/* 风险提示（移到最下面） */}
                  <div className="p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="h-4 w-4 text-amber-600" />
                        <div>
                          <span className="text-xs font-medium text-amber-700 flex items-center gap-1">
                            风险提示
                            <Badge variant="outline" className="ml-1 text-[9px] bg-amber-50">金融必备</Badge>
                          </span>
                          <p className="text-[10px] text-amber-600 mt-0.5">开启后自动在文末添加免责声明</p>
                        </div>
                      </div>
                      <Switch
                        checked={enableRiskWarning}
                        onCheckedChange={setEnableRiskWarning}
                        className="data-[state=checked]:bg-amber-500"
                      />
                    </div>
                    {enableRiskWarning && (
                      <div className="mt-2 p-2 bg-white/80 rounded-lg">
                        <p className="text-[10px] text-gray-500 italic">
                          "以上内容仅供参考，不构成投资建议。投资有风险，入市需谨慎。"
                        </p>
                      </div>
                    )}
                  </div>

                  {/* 返回修改 */}
                  <Button variant="ghost" onClick={() => setCurrentSceneStep(2)} className="w-full text-xs text-gray-400 h-7">
                    ← 返回修改关键词
                  </Button>
                </CardContent>
              </Card>
            )}

          </div>

          {/* ==================== 右侧：输出区域 ==================== */}
          <div className="lg:col-span-7">
            <Card className="border-0 shadow-lg bg-white/90 lg:sticky lg:top-4">
              <CardHeader className="pb-2 pt-3 sm:pt-4 px-4 sm:px-5">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-gray-800">生成结果</CardTitle>
                  {titles.length > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="flex bg-gray-100 rounded-lg p-0.5">
                        <button
                          onClick={() => setViewMode('split')}
                          className={`px-2.5 py-1 text-xs rounded-md transition-all ${
                            viewMode === 'split' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                          }`}
                        >
                          拆分视图
                        </button>
                        <button
                          onClick={handleIntegrate}
                          className={`px-2.5 py-1 text-xs rounded-md transition-all ${
                            viewMode === 'integrated' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                          }`}
                        >
                          整合视图
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="px-4 sm:px-5 pb-4">
                {/* 初始空状态（无加载、无内容） */}
                {!isGenerating && titles.length === 0 && generatedTitles.length === 0 && !content ? (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                    <FileText className="h-10 w-10 mb-2" />
                    <p className="text-sm">点击"一键生成爆款内容"开始创作</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    
                    {/* 引导提示 - 拆分视图时显示 */}
                    {viewMode === 'split' && showGuide && titles.length > 0 && !isGenerating && (
                      <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                        <div className="flex items-start gap-2">
                          <Lightbulb className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                          <div className="text-xs text-blue-700">
                            <p className="font-medium mb-1">💡 操作指引</p>
                            <p>1. 从标题候选中选择最喜欢的标题</p>
                            <p>2. 可以编辑正文内容进行微调</p>
                            <p>3. 选择喜欢的配图</p>
                            <p>4. 确认后点击「整合视图」一键复制到小红书</p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* 拆分视图 - 边生成边显示 */}
                    {viewMode === 'split' && (
                      <div className="space-y-3">
                        {/* 标题模块 */}
                        {(titles.length > 0 || generatedTitles.length > 0) && (
                          <div className="p-3 border rounded-xl">
                            <div className="flex items-center justify-between mb-2">
                              <Label className="text-xs font-medium text-gray-700 flex items-center gap-1">
                                <Sparkles className="h-3 w-3 text-rose-500" />
                                标题候选（选择一个）
                              </Label>
                              {!isGenerating && (
                                <div className="flex items-center gap-1">
                                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => toggleLock('title')}>
                                    {lockedModules.has('title') ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                                  </Button>
                                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handleGenerate}>
                                    <RefreshCw className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                            </div>
                            <div className="space-y-1.5">
                              {(titles.length > 0 ? titles : generatedTitles.map((t, i) => ({ title: t, id: i }))).map((t, i) => (
                                <button
                                  key={i}
                                  onClick={() => setSelectedTitleIndex(i)}
                                  className={`w-full p-2 rounded-lg text-left text-xs transition-all ${
                                    selectedTitleIndex === i 
                                      ? 'bg-rose-50 border-2 border-rose-300 ring-1 ring-rose-200' 
                                      : 'bg-gray-50 border border-gray-200 hover:border-gray-300'
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                      selectedTitleIndex === i ? 'border-rose-500 bg-rose-500' : 'border-gray-300'
                                    }`}>
                                      {selectedTitleIndex === i && <Check className="h-2.5 w-2.5 text-white" />}
                                    </div>
                                    <span className={selectedTitleIndex === i ? 'text-gray-900 font-medium' : 'text-gray-700'}>{t.title}</span>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 正文模块 - 边生成边显示 */}
                        <div className="p-3 border rounded-xl">
                          <div className="flex items-center justify-between mb-2">
                            <Label className="text-xs font-medium text-gray-700 flex items-center gap-1">
                              <FileText className="h-3 w-3 text-rose-500" />
                              正文内容
                              {isGenerating && <span className="text-green-500 ml-1 animate-pulse">生成中...</span>}
                            </Label>
                            {!isGenerating && content && (
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => toggleLock('content')}>
                                  {lockedModules.has('content') ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                                </Button>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setIsEditing(!isEditing)}>
                                  {isEditing ? <Eye className="h-3 w-3" /> : <Edit3 className="h-3 w-3" />}
                                </Button>
                              </div>
                            )}
                          </div>
                          {isEditing && !isGenerating ? (
                            <Textarea
                              value={editableContent}
                              onChange={(e) => {
                                setEditableContent(e.target.value);
                                setUserEdited(true);
                              }}
                              className="min-h-[200px] text-xs"
                              placeholder="编辑内容..."
                            />
                          ) : (
                            <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed min-h-[100px]">
                              {content ? (
                                <>
                                  {content}
                                  {isGenerating && <span className="inline-block w-2 h-4 bg-rose-400 ml-1 animate-pulse"></span>}
                                </>
                              ) : (
                                <span className="text-gray-400">
                                  {isGenerating ? '正在生成内容...' : '点击「一键生成爆款内容」开始创作'}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* 标签模块 */}
                        {tags.length > 0 && (
                          <div className="p-3 border rounded-xl">
                            <div className="flex items-center justify-between mb-2">
                              <Label className="text-xs font-medium text-gray-700 flex items-center gap-1">
                                <Tag className="h-3 w-3 text-rose-500" />
                                推荐标签
                              </Label>
                              {!isGenerating && (
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => toggleLock('tags')}>
                                  {lockedModules.has('tags') ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                                </Button>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {tags.map((tag, i) => (
                                <span key={i} className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">#{tag}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 整合视图 - 生成完毕后显示完整结果 */}
                    {viewMode === 'integrated' && !isGenerating && content && (
                      <div className="space-y-3">
                        {/* 标题 */}
                        <div className="p-3 bg-gradient-to-r from-rose-50 to-pink-50 rounded-xl border border-rose-100">
                          <div className="flex items-center gap-2 mb-2">
                            <Sparkles className="h-4 w-4 text-rose-500" />
                            <span className="text-xs text-rose-600 font-medium">已生成标题</span>
                          </div>
                          <div className="text-base font-semibold text-gray-900">
                            {titles.length > 0 ? titles[selectedTitleIndex ?? 0]?.title : generatedTitles[selectedTitleIndex ?? 0]}
                          </div>
                        </div>

                        {/* 正文 */}
                        <div className="p-3 bg-gray-50 rounded-xl">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-2 h-2 rounded-full bg-green-600"></div>
                            <span className="text-xs text-gray-500">生成完成</span>
                          </div>
                          <div className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed">
                            {isEditing ? (
                              <Textarea
                                value={editableContent}
                                onChange={(e) => handleContentEdit(e.target.value)}
                                className="min-h-[180px] resize-none text-xs"
                              />
                            ) : (
                              <>
                                {editableContent || content}
                              </>
                            )}
                          </div>
                        </div>

                        {/* 标签 */}
                        {tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {tags.map((tag, i) => (
                              <Badge key={i} className="bg-rose-100 text-rose-700 border-0 text-xs">#{tag}</Badge>
                            ))}
                          </div>
                        )}

                        {/* 配图 */}
                        {imageUrls.length > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-500">配图（点击选择）</span>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-6 text-xs" 
                                onClick={() => setShowCustomImageModal(true)}
                              >
                                <ImagePlus className="h-3 w-3 mr-1" />
                                自定义生图
                              </Button>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              {imageUrls.map((url, i) => (
                                <button
                                  key={i}
                                  onClick={() => setSelectedImageIndex(i)}
                                  className={`relative aspect-square rounded-xl overflow-hidden ${
                                    selectedImageIndex === i ? 'ring-2 ring-rose-500 ring-offset-2' : ''
                                  }`}
                                >
                                  <img src={url} alt="" className="w-full h-full object-cover" />
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 推荐音乐（视频内容） */}
                        {isVideo && recommendedMusic.length > 0 && (
                          <div className="p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-100">
                            <div className="flex items-center gap-1.5 mb-2">
                              <Music className="h-4 w-4 text-purple-500" />
                              <span className="text-xs font-medium text-gray-700">推荐音乐</span>
                            </div>
                            <div className="space-y-1">
                              {recommendedMusic.map((music, i) => (
                                <p key={i} className="text-xs text-gray-600">{i + 1}. {music}</p>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 种草力评分 */}
                        {engagementScore && (
                          <div className="p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-100">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium text-gray-700">种草力评分</span>
                              <span className="text-xl font-bold text-amber-600">{engagementScore.score}/10</span>
                            </div>
                            {engagementScore.reasons.length > 0 && (
                              <div className="text-[10px] text-gray-600">
                                {engagementScore.reasons.join('；')}
                              </div>
                            )}
                          </div>
                        )}

                        {/* 合规状态（首次弹出 + 不再提示） */}
                        {!compliance.isCompliant && !hideComplianceForever && (
                          <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 text-amber-700 font-medium text-xs">
                                <AlertTriangle className="h-3.5 w-3.5" />
                                {compliance.fixed ? '已自动修正' : '合规提醒'}
                              </div>
                              <div className="flex items-center gap-1">
                                {!compliance.fixed && !userEdited && (
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="h-6 text-xs"
                                    onClick={handleComplianceFix}
                                  >
                                    自动修正
                                  </Button>
                                )}
                                {showComplianceFirstTime && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 px-1.5 text-xs text-gray-400 hover:text-gray-600"
                                    onClick={() => {
                                      setHideComplianceForever(true);
                                    }}
                                  >
                                    不再提示
                                  </Button>
                                )}
                              </div>
                            </div>
                            {compliance.warnings.length > 0 && (
                              <div className="mt-1">
                                {compliance.warnings.map((w, i) => (
                                  <p key={i} className="text-xs text-amber-600">{w}</p>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* 整合视图 - 生成中的加载指示 */}
                    {viewMode === 'integrated' && isGenerating && (
                      <div className="space-y-3">
                        <div className="p-4 bg-gradient-to-r from-rose-50 to-pink-50 rounded-xl border border-rose-100">
                          <div className="flex items-center justify-center gap-2 mb-2">
                            <div className="w-4 h-4 border-2 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-sm text-rose-600">{currentStep || '正在构思内容...'}</span>
                          </div>
                          {content && (
                            <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                              {content}
                              <span className="inline-block w-2 h-4 bg-rose-400 ml-1 animate-pulse"></span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* 底部操作栏 */}
                    {!isGenerating && content && (
                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 text-xs"
                          onClick={handleCopyContent}
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          复制内容
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          className="flex-1 bg-gradient-to-r from-rose-500 to-orange-500 text-xs"
                          onClick={handlePublish}
                        >
                          <Rocket className="h-3 w-3 mr-1" />
                          发布笔记
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 底部 */}
        <div className="text-center mt-6 text-gray-400 text-xs">
          Made with <Heart className="h-3 w-3 inline text-rose-500 fill-rose-500" /> by AI
        </div>
      </div>

      {/* 历史记录弹窗 */}
      {showHistory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg max-h-[70vh] overflow-hidden bg-white">
            <CardHeader className="flex flex-row items-center justify-between py-3 px-5">
              <CardTitle className="text-sm">历史记录</CardTitle>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setShowHistory(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[50vh]">
                {historyRecords.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 text-sm">暂无历史记录</div>
                ) : (
                  <div className="divide-y">
                    {historyRecords.map((record) => (
                      <div key={record.id} className="p-3 hover:bg-gray-50">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 cursor-pointer" onClick={() => handleLoadHistory(record)}>
                            <div className="font-medium text-gray-900 text-sm line-clamp-1">{record.title || '无标题'}</div>
                            <div className="text-xs text-gray-500 mt-1 line-clamp-2">{record.content}</div>
                            <div className="text-[10px] text-gray-400 mt-1.5">
                              {new Date(record.createdAt).toLocaleString('zh-CN')}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 ml-3">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleLoadHistory(record)}>
                              <FileEdit className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleDeleteHistory(record.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 自定义生图弹窗 */}
      {showCustomImageModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md bg-white">
            <CardHeader className="flex flex-row items-center justify-between py-3 px-5">
              <CardTitle className="text-sm flex items-center gap-2">
                <ImagePlus className="h-4 w-4 text-rose-500" />
                自定义生成配图
              </CardTitle>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setShowCustomImageModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="px-4 sm:px-5 pb-4 space-y-3">
              <div>
                <Label className="text-xs text-gray-500 mb-1.5 block">图片描述</Label>
                <Textarea
                  placeholder="描述你想要的图片，例如：简约风格的理财规划图表，蓝色渐变背景，无文字..."
                  value={customImagePrompt}
                  onChange={(e) => setCustomImagePrompt(e.target.value)}
                  className="min-h-[100px] text-sm"
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  💡 提示：图片会自动添加"无文字"约束，适合作为小红书封面
                </p>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1" 
                  onClick={() => setShowCustomImageModal(false)}
                >
                  取消
                </Button>
                <Button 
                  className="flex-1 bg-rose-500 hover:bg-rose-600"
                  onClick={handleCustomImageGenerate}
                  disabled={isGeneratingImage}
                >
                  {isGeneratingImage ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      生成中...
                    </>
                  ) : (
                    <>
                      <ImageIcon className="h-4 w-4 mr-2" />
                      生成配图
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
