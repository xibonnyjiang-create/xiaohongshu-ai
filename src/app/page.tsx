'use client';

import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Sparkles, Loader2, Copy, Check, AlertTriangle,
  Edit3, Save, History, Rocket, Tag, WandSparkles,
  X, TrendingUp, Clock, RefreshCw, FileText, ImageIcon, Video,
  ChevronLeft, Settings2, Flame, Filter
} from 'lucide-react';
import { toast } from 'sonner';
import {
  TopicType, TitleCandidate, HotTopic, EngagementScore, OutputFormat, VideoDuration
} from '@/lib/types';
import {
  SCENE_OPTIONS, PERSONA_OPTIONS, PERSONA_STYLE_CONFIG,
  KEYWORD_RECOMMENDATIONS, TOPIC_RECOMMENDATIONS, SHOW_HOT_TOPICS_TOPIC,
  OUTPUT_FORMAT_OPTIONS, VIDEO_DURATION_OPTIONS, LIFE_STYLE_KEYWORDS, WEIXIN_SECURITY_MAPPING,
  CONTENT_REQUIREMENT_GROUPS, CONTENT_REQUIREMENT_SOLO_OPTIONS
} from '@/lib/constants';

export default function Home() {
  // ==================== 场景选择 ====================
  const [topicType, setTopicType] = useState<TopicType>('market_hot');
  const [keywords, setKeywords] = useState('');
  const [deepAnalysis, setDeepAnalysis] = useState(false); // 市场热点时自动开启

  // ==================== 输出形式选择 ====================
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('image_text');
  const [videoDuration, setVideoDuration] = useState<VideoDuration>('60s');

  // ==================== 人设选择 ====================
  const [personaType, setPersonaType] = useState<string>('campus_explorer');
  const [customPersona, setCustomPersona] = useState('');
  const [showPersonaDialog, setShowPersonaDialog] = useState(false);

  // ==================== 补充要求 ====================
  const [contentRequirements, setContentRequirements] = useState<string[]>([]);
  const [customRequirement, setCustomRequirement] = useState('');
  const [showRequirementDialog, setShowRequirementDialog] = useState(false);

  // ==================== 热榜数据 ====================
  const [hotTopics, setHotTopics] = useState<HotTopic[]>([]);
  const [hotTopicsLoading, setHotTopicsLoading] = useState(false);
  const [selectedHotTopic, setSelectedHotTopic] = useState<HotTopic | null>(null);
  const [hotTop3Tags, setHotTop3Tags] = useState<string[]>([]);
  const [hotCategory, setHotCategory] = useState<string>('finance');
  const [hotUpdateTime, setHotUpdateTime] = useState<string>('');
  const [filterSensitive, setFilterSensitive] = useState(true); // 过滤敏感内容开关

  // 热点板块配置
  const HOT_CATEGORIES = [
    { id: 'finance', name: '财经热搜', icon: '📈' },
    { id: 'tech', name: '科技前沿', icon: '🚀' },
    { id: 'global', name: '环球财经', icon: '🌍' },
  ];

  // ==================== 生成状态 ====================
  const [step, setStep] = useState<'input' | 'titles' | 'content'>('input');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState('');
  const [viewMode, setViewMode] = useState<'integrated' | 'split'>('split');
  const [isEditing, setIsEditing] = useState(false);
  const [userEdited, setUserEdited] = useState(false);
  const [showGuide, setShowGuide] = useState(true);

  // ==================== 输出状态 ====================
  const [generatedTitles, setGeneratedTitles] = useState<TitleCandidate[]>([]);
  const [selectedTitleIndex, setSelectedTitleIndex] = useState<number | null>(null);
  const [content, setContent] = useState('');
  const [editableContent, setEditableContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [imagePrompt, setImagePrompt] = useState<string>(''); // 生图口令
  const [customImagePrompt, setCustomImagePrompt] = useState<string>(''); // 自定义生图口令
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string>(''); // 直接生成的图片
  const [isGeneratingImage, setIsGeneratingImage] = useState(false); // 生图中
  const [videoScript, setVideoScript] = useState<{ hook: string; segments: { visual: string; voiceover: string; duration: string; action?: string }[]; cta: string; bgm?: { name: string; reason: string } } | null>(null);
  const [compliance, setCompliance] = useState<{ isCompliant: boolean; warnings: string[]; fixed?: boolean; fixedContent?: string }>({ isCompliant: true, warnings: [] });

  // ==================== 历史记录 ====================
  const [showHistory, setShowHistory] = useState(false);
  const [historyRecords, setHistoryRecords] = useState<Array<{
    id: string; title: string; content: string; tags: string[];
    image_urls: string[]; selected_image_url?: string;
    scene?: string; persona?: string; keyword?: string;
    video_script?: { script: string; duration: string } | null;
    is_favorite: boolean; created_at: string;
  }>>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // 加载历史记录
  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch('/api/history?limit=50');
      const data = await res.json();
      if (data.records) setHistoryRecords(data.records);
    } catch (e) {
      console.error('加载历史记录失败:', e);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  // 自动保存到历史记录
  const saveToHistory = useCallback(async (title: string, contentText: string, tagsList: string[], imgUrls: string[], genImageUrl: string) => {
    try {
      await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content: contentText,
          tags: tagsList,
          imageUrls: imgUrls,
          imageUrl: genImageUrl || null,
          scene: topicType,
          persona: personaType,
          keyword: keywords || selectedHotTopic?.title || '',
          videoScript: videoScript ? { script: JSON.stringify(videoScript), duration: videoDuration } : null,
        }),
      });
    } catch (e) {
      console.error('保存历史记录失败:', e);
    }
  }, [topicType, personaType, keywords, selectedHotTopic, videoScript, videoDuration]);

  // 删除历史记录
  const deleteHistory = useCallback(async (id: string) => {
    try {
      await fetch(`/api/history?id=${id}`, { method: 'DELETE' });
      setHistoryRecords(prev => prev.filter(r => r.id !== id));
      toast.success('已删除');
    } catch (e) {
      toast.error('删除失败');
    }
  }, []);

  // 打开历史记录弹窗
  const openHistory = useCallback(() => {
    setShowHistory(true);
    loadHistory();
  }, [loadHistory]);

  // 查看历史记录详情
  const viewHistoryRecord = useCallback((record: typeof historyRecords[0]) => {
    setShowHistory(false);
    setGeneratedTitles([{ title: record.title, style: 'emotional' }]);
    setSelectedTitleIndex(0);
    setContent(record.content);
    setEditableContent(record.content);
    setTags(record.tags || []);
    setImageUrls(record.image_urls || []);
    setGeneratedImageUrl(record.selected_image_url || '');
    setStep('content');
    setViewMode('integrated');
  }, []);

  // ==================== 计算属性 ====================
  const showHotTopics = SHOW_HOT_TOPICS_TOPIC.includes(topicType);
  const keywordsByScene = KEYWORD_RECOMMENDATIONS[topicType];
  const topicRecommendations = TOPIC_RECOMMENDATIONS[topicType];
  const personaStyleConfig = PERSONA_STYLE_CONFIG[personaType as keyof typeof PERSONA_STYLE_CONFIG] || PERSONA_STYLE_CONFIG.custom;
  const weixinMapping = WEIXIN_SECURITY_MAPPING[topicType] || [];

  // ==================== 加载热搜 ====================
  const loadHotTopics = useCallback(async () => {
    setHotTopicsLoading(true);
    try {
      const res = await fetch(`/api/hot-topics?category=${hotCategory}&filter=${filterSensitive}`);
      if (res.ok) {
        const data = await res.json();
        setHotTopics(data.topics || []);
        setHotUpdateTime(data.updateTime || '');
        if (data.top3Tags) {
          setHotTop3Tags(data.top3Tags);
        }
      }
    } catch (e) {
      console.log('热搜加载失败');
    } finally {
      setHotTopicsLoading(false);
    }
  }, [hotCategory, filterSensitive]);

  useEffect(() => {
    if (showHotTopics && topicType === 'market_hot') {
      loadHotTopics();
    }
  }, [showHotTopics, topicType, hotCategory, filterSensitive, loadHotTopics]);

  // 市场热点自动开启深度分析
  useEffect(() => {
    setDeepAnalysis(topicType === 'market_hot');
  }, [topicType]);

  // ==================== 标题生成 ====================
  const handleGenerateTitles = useCallback(async () => {
    if (!keywords.trim() && !selectedHotTopic && topicType !== 'beginner_guide') {
      toast.error('请输入关键词或选择热点');
      return;
    }

    setIsGenerating(true);
    setCurrentStep('正在生成标题...');

    try {
      const response = await fetch('/api/generate-title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicType,
          keywords: keywords || selectedHotTopic?.title,
          personaType,
          hotTopicInfo: selectedHotTopic ? `${selectedHotTopic.title}\n${selectedHotTopic.snippet}` : undefined,
          hotTop3Tags,
        }),
      });

      if (!response.ok) throw new Error('标题生成失败');

      const data = await response.json();
      if (data.titles && data.titles.length > 0) {
        setGeneratedTitles(data.titles);
        setSelectedTitleIndex(0);
        setStep('titles');
        toast.success('标题生成完成！请选择标题');
      } else {
        toast.error('未生成标题，请重试');
      }
    } catch (error) {
      toast.error('标题生成失败');
    } finally {
      setIsGenerating(false);
      setCurrentStep('');
    }
  }, [topicType, keywords, personaType, selectedHotTopic, hotTop3Tags]);

  // ==================== 内容生成 ====================
  const handleGenerateContent = useCallback(async () => {
    if (selectedTitleIndex === null || !generatedTitles[selectedTitleIndex]) {
      toast.error('请先选择一个标题');
      return;
    }

    setIsGenerating(true);
    setCurrentStep('正在生成内容...');
    setStep('content');
    setContent('');
    setEditableContent('');
    setVideoScript(null);

    const selectedTitle = generatedTitles[selectedTitleIndex].title;

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicType,
          keywords,
          deepAnalysis,
          outputFormat,
          videoDuration,
          personaType,
          hotTopicInfo: selectedHotTopic ? `${selectedHotTopic.title}\n${selectedHotTopic.snippet}` : undefined,
          hotTop3Tags,
          selectedTitle,
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
                  case 'content':
                    accumulatedContent += data.data;
                    setContent(accumulatedContent);
                    setEditableContent(accumulatedContent);
                    break;
                  case 'video_script':
                    setVideoScript(data.data);
                    break;
                  case 'tags':
                    setTags(data.data);
                    break;
                  case 'image_prompt':
                    setImagePrompt(data.data);
                    break;
                  case 'images':
                    setImageUrls(data.data);
                    break;
                  case 'compliance':
                    setCompliance(data.data);
                    if (!data.data.isCompliant && !userEdited && data.data.fixedContent) {
                      setEditableContent(data.data.fixedContent);
                      setContent(data.data.fixedContent);
                    }
                    setCurrentStep('');
                    setViewMode('integrated');
                    toast.success('内容生成完成！');
                    break;
                }
              } catch (e) {}
            }
          }
        }
        // 自动保存到历史记录
        saveToHistory(selectedTitle, accumulatedContent, [], [], '');
      }
    } catch (error) {
      console.error('生成错误:', error);
      toast.error('生成失败，请重试');
    } finally {
      setIsGenerating(false);
    }
  }, [selectedTitleIndex, generatedTitles, topicType, keywords, deepAnalysis, personaType, selectedHotTopic, hotTop3Tags, userEdited, saveToHistory]);

  // ==================== 重新生成内容 ====================
  const handleRegenerateContent = useCallback(async () => {
    if (selectedTitleIndex === null || !generatedTitles[selectedTitleIndex]) {
      toast.error('请先选择一个标题');
      return;
    }

    setIsGenerating(true);
    setCurrentStep('正在重新生成...');
    setContent('');
    setEditableContent('');
    setTags([]);
    setImagePrompt('');
    setGeneratedImageUrl('');

    const selectedTitle = generatedTitles[selectedTitleIndex].title;

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicType,
          keywords,
          deepAnalysis,
          outputFormat,
          videoDuration,
          personaType,
          hotTopicInfo: selectedHotTopic ? `${selectedHotTopic.title}\n${selectedHotTopic.snippet}` : undefined,
          hotTop3Tags,
          selectedTitle,
        }),
      });

      if (response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedContent = '';
        let accumulatedTags: string[] = [];
        let accumulatedImagePrompt = '';
        let accumulatedScript: typeof videoScript = null;
        let complianceData: typeof compliance = { isCompliant: true, warnings: [] };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data:')) {
              try {
                const data = JSON.parse(line.slice(5));
                switch (data.type) {
                  case 'content':
                    accumulatedContent += data.data;
                    setContent(accumulatedContent);
                    setEditableContent(accumulatedContent);
                    break;
                  case 'tags':
                    accumulatedTags = data.data;
                    setTags(accumulatedTags);
                    break;
                  case 'image_prompt':
                    accumulatedImagePrompt = data.data;
                    setImagePrompt(accumulatedImagePrompt);
                    break;
                  case 'video_script':
                    accumulatedScript = data.data;
                    setVideoScript(accumulatedScript);
                    break;
                  case 'compliance':
                    complianceData = data.data;
                    setCompliance(complianceData);
                    if (!complianceData.isCompliant && !userEdited && complianceData.fixedContent) {
                      setEditableContent(complianceData.fixedContent);
                      setContent(complianceData.fixedContent);
                    }
                    break;
                }
              } catch (e) {}
            }
          }
        }
        setCurrentStep('');
        toast.success('内容已更新！');
      }
    } catch (error) {
      console.error('重新生成错误:', error);
      toast.error('生成失败，请重试');
    } finally {
      setIsGenerating(false);
    }
  }, [selectedTitleIndex, generatedTitles, topicType, keywords, deepAnalysis, outputFormat, videoDuration, personaType, selectedHotTopic, hotTop3Tags, userEdited]);

  // ==================== 重新生成标签 ====================
  const handleRegenerateTags = useCallback(async () => {
    if (selectedTitleIndex === null || !generatedTitles[selectedTitleIndex]) {
      toast.error('请先选择一个标题');
      return;
    }

    try {
      const selectedTitle = generatedTitles[selectedTitleIndex].title;
      const response = await fetch('/api/regenerate-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicType,
          keywords,
          selectedTitle,
          content: content,
        }),
      });

      const data = await response.json();
      if (data.tags) {
        setTags(data.tags);
        toast.success('标签已更新！');
      }
    } catch (error) {
      console.error('标签生成错误:', error);
      toast.error('标签生成失败');
    }
  }, [selectedTitleIndex, generatedTitles, topicType, keywords, content]);

  // ==================== 复制内容 ====================
  const handleCopyContent = useCallback(() => {
    if (editableContent) {
      navigator.clipboard.writeText(editableContent);
      toast.success('已复制到剪贴板');
    }
  }, [editableContent]);

  // ==================== 生成图文复制文本 ====================
  const generateImageTextCopyText = useCallback(() => {
    if (!editableContent) return '';
    
    // 获取用户选择的标题
    const title = selectedTitleIndex !== null && generatedTitles[selectedTitleIndex] 
      ? generatedTitles[selectedTitleIndex].title 
      : '';
    
    let text = '';
    
    // 标题
    if (title) {
      text += `${title}\n\n`;
    }
    
    // 正文内容
    text += `${editableContent}\n\n`;
    
    // 标签
    if (tags.length > 0) {
      text += tags.map(t => `#${t}`).join(' ');
    }
    
    return text.trim();
  }, [editableContent, generatedTitles, selectedTitleIndex, tags]);

  // ==================== 返回修改标题 ====================
  const handleBackToTitles = () => {
    setStep('titles');
    setContent('');
    setEditableContent('');
    setTags([]);
    setImageUrls([]);
    setCompliance({ isCompliant: true, warnings: [] });
  };

  // ==================== 生成视频脚本复制文本 ====================
  const generateVideoCopyText = useCallback(() => {
    if (!videoScript) return '';
    
    const title = selectedTitleIndex !== null && generatedTitles[selectedTitleIndex] 
      ? generatedTitles[selectedTitleIndex].title 
      : '';
    let text = `${title}\n\n`;
    
    // 黄金钩子
    text += `【黄金3秒钩子】\n${videoScript.hook}\n\n`;
    
    // 分镜脚本
    text += `【完整脚本】\n`;
    videoScript.segments.forEach((seg, i) => {
      text += `【镜头${i + 1}】${seg.duration}\n`;
      text += `📷 ${seg.visual}\n`;
      text += `🎤 ${seg.voiceover}\n\n`;
    });
    
    // CTA
    text += `【结尾行动号召】\n${videoScript.cta}\n\n`;
    
    // BGM
    if (videoScript.bgm) {
      text += `【BGM推荐】\n`;
      text += `🎧 ${videoScript.bgm.name}\n`;
      text += `💡 ${videoScript.bgm.reason}\n\n`;
    }
    
    // 标签
    text += `【话题标签】\n`;
    text += tags.map(t => `#${t}`).join(' ');
    
    return text;
  }, [videoScript, generatedTitles, selectedTitleIndex, tags]);

  // ==================== 渲染 ====================
  return (
    <div className="h-screen bg-gradient-to-br from-rose-50 via-white to-pink-50 flex flex-col">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-rose-100">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-800">小红书爆款生成器</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={openHistory}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-rose-50 hover:text-rose-600 transition-colors"
            >
              <History className="w-3.5 h-3.5" />
              <span>历史</span>
            </button>
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('split')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  viewMode === 'split' ? 'bg-white shadow text-gray-800' : 'text-gray-500'
                }`}
              >
                拆分
              </button>
              <button
                onClick={() => setViewMode('integrated')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  viewMode === 'integrated' ? 'bg-white shadow text-gray-800' : 'text-gray-500'
                }`}
              >
                整合
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className={step === 'input' ? 'h-[calc(100vh-3.5rem)] overflow-hidden' : 'min-h-[calc(100vh-3.5rem)] overflow-y-auto'}>
        <div className={step === 'input' ? 'h-full max-w-5xl mx-auto px-4' : viewMode === 'split' ? 'grid grid-cols-2 gap-6 max-w-5xl mx-auto px-4 py-6' : 'max-w-3xl mx-auto px-4 py-6'}>
          <div>

            {/* Step 1: 场景选择 - 一屏三列布局 */}
            {step === 'input' && (
              <div className="h-full flex flex-col py-3">
                {/* 顶部标题 */}
                <div className="text-center mb-3 shrink-0">
                  <h2 className="text-lg font-bold bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent">小红书爆款内容创作</h2>
                  <p className="text-[11px] text-gray-400 mt-0.5">AI智能创作，一键生成小红书风格图文</p>
                </div>

                {/* 三列主体 */}
                <div className="flex-1 grid grid-cols-3 gap-3 min-h-0 overflow-hidden">
                  {/* 左列：创作场景 */}
                  <Card className="border-0 shadow-md bg-white/90 flex flex-col overflow-hidden min-h-0">
                    <CardHeader className="pb-2 pt-3 px-4 shrink-0">
                      <CardTitle className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-gradient-to-br from-rose-500 to-pink-500 text-white text-[10px] flex items-center justify-center shrink-0">1</span>
                        选择创作场景
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-3 flex-1 overflow-y-auto space-y-2 min-h-0">
                      {/* 场景列表 */}
                      <div className="space-y-1">
                        {SCENE_OPTIONS.map(option => (
                          <button
                            key={option.value}
                            onClick={() => {
                              setTopicType(option.value);
                              setSelectedHotTopic(null);
                            }}
                            className={`w-full p-2 rounded-lg text-left transition-all text-xs ${
                              topicType === option.value
                                ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-sm'
                                : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                            }`}
                          >
                            <span className="font-medium">{option.emoji} {option.label}</span>
                            {topicType === option.value && (
                              <p className="text-[10px] mt-0.5 text-rose-100">{option.description}</p>
                            )}
                          </button>
                        ))}
                      </div>

                      {/* 输出形式 */}
                      <div className="pt-2 border-t border-gray-100">
                        <p className="text-[10px] text-gray-400 mb-1">输出形式</p>
                        <div className="grid grid-cols-2 gap-1">
                          {OUTPUT_FORMAT_OPTIONS.map(option => (
                            <button
                              key={option.value}
                              onClick={() => setOutputFormat(option.value)}
                              className={`p-1.5 rounded-lg text-center transition-all text-[10px] ${
                                outputFormat === option.value
                                  ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-sm'
                                  : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                              }`}
                            >
                              <span>{option.emoji} {option.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 视频时长 - 仅视频模式 */}
                      {outputFormat === 'video' && (
                        <div className="pt-2 border-t border-gray-100">
                          <p className="text-[10px] text-gray-400 mb-1">视频时长</p>
                          <div className="grid grid-cols-2 gap-1">
                            {VIDEO_DURATION_OPTIONS.map(option => (
                              <button
                                key={option.value}
                                onClick={() => setVideoDuration(option.value)}
                                className={`p-1.5 rounded-lg text-center transition-all text-[10px] ${
                                  videoDuration === option.value
                                    ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-sm'
                                    : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                                }`}
                              >
                                <span className="font-medium">{option.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 补充要求 */}
                      <div className="pt-2 border-t border-gray-100">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-[10px] text-gray-400 flex items-center gap-0.5">
                            <Settings2 className="w-2.5 h-2.5" /> 补充要求
                          </p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowRequirementDialog(true)}
                            className="h-4 px-1 text-[10px] text-gray-400 hover:text-rose-500"
                          >
                            <Edit3 className="w-2.5 h-2.5 mr-0.5" />
                            自定义
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {CONTENT_REQUIREMENT_GROUPS.map(group => (
                            <div key={group.groupKey} className="inline-flex rounded-full overflow-hidden border border-rose-200">
                              {group.options.map(option => {
                                const isSelected = contentRequirements.includes(option.value);
                                return (
                                  <button
                                    key={option.value}
                                    onClick={() => {
                                      const groupValues = group.options.map(o => o.value);
                                      const otherReqs = contentRequirements.filter(r => !groupValues.includes(r));
                                      if (isSelected) {
                                        setContentRequirements(otherReqs);
                                      } else {
                                        setContentRequirements([...otherReqs, option.value]);
                                      }
                                    }}
                                    className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium transition-all ${
                                      isSelected
                                        ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white'
                                        : 'bg-rose-50 hover:bg-rose-100 text-rose-600'
                                    }`}
                                  >
                                    <span>{option.emoji}</span>
                                    <span>{option.label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          ))}
                          {CONTENT_REQUIREMENT_SOLO_OPTIONS.map(option => {
                            const isSelected = contentRequirements.includes(option.value);
                            return (
                              <button
                                key={option.value}
                                onClick={() => {
                                  if (isSelected) {
                                    setContentRequirements(contentRequirements.filter(r => r !== option.value));
                                  } else {
                                    setContentRequirements([...contentRequirements, option.value]);
                                  }
                                }}
                                className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium transition-all ${
                                  isSelected
                                    ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-sm'
                                    : 'bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200'
                                }`}
                              >
                                <span>{option.emoji}</span>
                                <span>{option.label}</span>
                              </button>
                            );
                          })}
                          {customRequirement && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-sm">
                              <span>✏️</span>
                              <span>{customRequirement}</span>
                              <X
                                className="w-2 h-2 ml-0.5 cursor-pointer hover:opacity-80"
                                onClick={() => setCustomRequirement('')}
                              />
                            </span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* 中列：创作主题 */}
                  <Card className="border-0 shadow-md bg-white/90 flex flex-col overflow-hidden min-h-0">
                    <CardHeader className="pb-2 pt-3 px-4 shrink-0">
                      <CardTitle className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-gradient-to-br from-rose-500 to-pink-500 text-white text-[10px] flex items-center justify-center shrink-0">2</span>
                        选择创作主题
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-3 flex-1 flex flex-col gap-2 min-h-0 overflow-hidden">
                      <div className="relative shrink-0">
                        <WandSparkles className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                        <Input
                          value={keywords}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setKeywords(e.target.value)}
                          placeholder="输入内容关键词..."
                          className="pl-8 text-xs border-rose-200 focus:border-rose-400 h-7"
                        />
                      </div>

                      {/* 推荐关键词 */}
                      <div className="flex flex-wrap gap-1 shrink-0">
                        {keywordsByScene.map((kw, i) => (
                          <button
                            key={i}
                            onClick={() => setKeywords(kw)}
                            className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium transition-all ${
                              keywords === kw
                                ? 'bg-rose-500 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {kw}
                          </button>
                        ))}
                      </div>

                      {/* 市场热点 - 热搜榜单（旧版风格） */}
                      {topicType === 'market_hot' && (
                        <div className="pt-2 border-t border-gray-100 flex-1 min-h-0 flex flex-col overflow-hidden">
                          {/* 标题行 */}
                          <div className="flex items-center justify-between mb-1.5 shrink-0">
                            <span className="text-[10px] font-bold text-gray-700 flex items-center gap-1">
                              <Flame className="w-3 h-3 text-orange-500" />
                              实时热搜
                            </span>
                            <div className="flex items-center gap-1">
                              {hotUpdateTime && (
                                <span className="text-[9px] text-gray-400">{hotUpdateTime}</span>
                              )}
                              <button
                                onClick={() => loadHotTopics()}
                                className="text-[9px] text-rose-400 hover:text-rose-500 flex items-center gap-0.5"
                              >
                                <RefreshCw className="w-2 h-2" /> 刷新
                              </button>
                            </div>
                          </div>

                          {/* 分类切换 */}
                          <div className="flex gap-1 mb-1.5 shrink-0">
                            {HOT_CATEGORIES.map(cat => (
                              <button
                                key={cat.id}
                                onClick={() => setHotCategory(cat.id)}
                                className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium transition-all ${
                                  hotCategory === cat.id
                                    ? 'bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-sm'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                              >
                                {cat.icon} {cat.name}
                              </button>
                            ))}
                          </div>

                          {/* 敏感过滤开关 */}
                          <div className="flex items-center justify-between mb-1.5 shrink-0">
                            <span className="text-[9px] text-gray-500 flex items-center gap-0.5">
                              <Filter className="w-2.5 h-2.5" />
                              过滤敏感内容
                            </span>
                            <button
                              onClick={() => setFilterSensitive(!filterSensitive)}
                              className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
                                filterSensitive ? 'bg-rose-500' : 'bg-gray-300'
                              }`}
                            >
                              <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                filterSensitive ? 'translate-x-3.5' : 'translate-x-0.5'
                              }`} />
                            </button>
                          </div>

                          {/* 热搜列表 */}
                          {hotTopicsLoading ? (
                            <div className="flex items-center justify-center py-3">
                              <Loader2 className="w-3 h-3 animate-spin text-rose-400" />
                              <span className="text-[10px] text-gray-400 ml-1">加载热搜...</span>
                            </div>
                          ) : hotTopics.length > 0 ? (
                            <div className="space-y-1 flex-1 min-h-0 overflow-y-auto" style={{ maxHeight: 'calc(3 * 2.25rem)' }}>
                              {hotTopics.map((topic, index) => (
                                <button
                                  key={topic.id}
                                  onClick={() => {
                                    setSelectedHotTopic(selectedHotTopic?.id === topic.id ? null : topic);
                                    if (selectedHotTopic?.id !== topic.id) {
                                      setKeywords(topic.title);
                                    }
                                  }}
                                  className={`w-full text-left px-2 py-1.5 rounded-lg transition-all ${
                                    selectedHotTopic?.id === topic.id
                                      ? 'bg-gradient-to-r from-rose-50 to-pink-50 border border-rose-300 shadow-sm'
                                      : 'hover:bg-gray-50 border border-transparent'
                                  }`}
                                >
                                  <div className="flex items-start gap-1.5">
                                    <span className={`flex-shrink-0 w-4 h-4 rounded text-[8px] font-bold flex items-center justify-center mt-0.5 ${
                                      index < 3 ? 'bg-gradient-to-br from-rose-500 to-pink-500 text-white' : 'bg-gray-200 text-gray-500'
                                    }`}>
                                      {index + 1}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                      <div className="text-[10px] font-medium text-gray-800 truncate">{topic.title}</div>
                                      {topic.snippet && (
                                        <div className="text-[9px] text-gray-400 truncate mt-0.5">{topic.snippet}</div>
                                      )}
                                    </div>
                                    {selectedHotTopic?.id === topic.id && (
                                      <Check className="w-3 h-3 text-rose-500 flex-shrink-0 mt-0.5" />
                                    )}
                                  </div>
                                </button>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[10px] text-gray-400 text-center py-2">暂无热搜数据</p>
                          )}

                          {/* 选中热搜的TOP3标签 */}
                          {selectedHotTopic && hotTop3Tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-1.5 mt-1 border-t border-gray-100 shrink-0">
                              {hotTop3Tags.map((tag, i) => (
                                <span key={i} className="px-1.5 py-0.5 rounded-full text-[9px] bg-rose-100 text-rose-600 font-medium">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* 小白科普 - 推荐主题 */}
                      {topicType === 'beginner_guide' && (
                        <div className="pt-2 border-t border-gray-100 shrink-0 overflow-y-auto flex-1 min-h-0">
                          <p className="text-[10px] font-medium text-green-600 mb-1 flex items-center gap-0.5">
                            <WandSparkles className="w-2.5 h-2.5" /> 推荐主题
                          </p>
                          {topicRecommendations.map((rec, index) => (
                            <div key={index} className="mb-1">
                              <p className="text-[10px] text-gray-500 mb-0.5">{rec.label}</p>
                              <div className="flex flex-wrap gap-1">
                                {rec.keywords.map((kw, i) => (
                                  <button
                                    key={i}
                                    onClick={() => setKeywords(kw)}
                                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium transition-all ${
                                      keywords === kw
                                        ? 'bg-green-500 text-white'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                  >
                                    {kw}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* 生活化种草 - 专属词库 */}
                      {topicType === 'life_lifestyle' && (
                        <div className="pt-2 border-t border-gray-100 shrink-0">
                          <p className="text-[10px] font-medium text-green-600 mb-1 flex items-center gap-0.5">
                            <Sparkles className="w-2.5 h-2.5" /> 专属词库
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {LIFE_STYLE_KEYWORDS.map((kw, i) => (
                              <button
                                key={i}
                                onClick={() => setKeywords(kw)}
                                className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium transition-all ${
                                  keywords === kw
                                    ? 'bg-green-500 text-white'
                                    : 'bg-white text-gray-600 hover:bg-green-100 border border-green-200'
                                }`}
                              >
                                {kw}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* 右列：创作人设 */}
                  <Card className="border-0 shadow-md bg-white/90 flex flex-col overflow-hidden min-h-0">
                    <CardHeader className="pb-2 pt-3 px-4 shrink-0">
                      <CardTitle className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-gradient-to-br from-rose-500 to-pink-500 text-white text-[10px] flex items-center justify-center shrink-0">3</span>
                        选择创作人设
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-3 flex-1 overflow-y-auto space-y-1.5 min-h-0">
                      <div className="space-y-1">
                        {PERSONA_OPTIONS.map(option => (
                          <button
                            key={option.value}
                            onClick={() => {
                              if (option.value === 'custom') {
                                setShowPersonaDialog(true);
                              } else {
                                setPersonaType(option.value);
                              }
                            }}
                            className={`w-full p-2 rounded-lg text-left transition-all text-xs ${
                              personaType === option.value
                                ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-sm'
                                : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                            }`}
                          >
                            <span className="font-medium">{option.emoji} {option.label}</span>
                            <p className={`text-[10px] mt-0.5 ${personaType === option.value ? 'text-rose-100' : 'text-gray-400'}`}>
                              {option.description}
                            </p>
                            {personaType === option.value && option.tags && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {option.tags.map(tag => (
                                  <span key={tag} className="text-[9px] px-1 py-0 rounded-full bg-white/20 text-white">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </button>
                        ))}
                      </div>

                      {/* 人设风格提示 */}
                      <div className="p-2 bg-gradient-to-r from-rose-50 to-pink-50 rounded-lg border border-rose-100">
                        <div className="flex items-center gap-1 text-[10px]">
                          <Badge variant="outline" className="bg-white text-[10px] px-1.5 py-0 h-4">
                            语气：{personaStyleConfig.tone}
                          </Badge>
                          <Badge variant="outline" className="bg-white text-[10px] px-1.5 py-0 h-4">
                            表达：{personaStyleConfig.emojiDensity}
                          </Badge>
                          <Badge variant="outline" className="bg-white text-[10px] px-1.5 py-0 h-4">
                            标题：{personaStyleConfig.titleStyle}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* 生成按钮 */}
                <div className="shrink-0 pt-2 pb-1">
                  <Button
                    onClick={handleGenerateTitles}
                    disabled={isGenerating || (!keywords.trim() && !selectedHotTopic && topicType !== 'beginner_guide')}
                    className="w-full h-10 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {currentStep || '生成中...'}
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        生成标题
                      </>
                    )}
                  </Button>
                </div>

                {/* 自定义人设弹窗 */}
                <Dialog open={showPersonaDialog} onOpenChange={setShowPersonaDialog}>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Edit3 className="w-4 h-4" />
                        自定义创作人设
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                      <p className="text-sm text-gray-600">
                        请描述您的自定义人设风格，包括：
                      </p>
                      <ul className="text-xs text-gray-500 space-y-1 list-disc list-inside">
                        <li>语气特点（如：亲切、专业、幽默）</li>
                        <li>表达习惯（如：喜欢用emoji、常用短语）</li>
                        <li>内容风格（如：数据导向、故事性强）</li>
                      </ul>
                      <Textarea
                        value={customPersona}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCustomPersona(e.target.value)}
                        placeholder="例如：我是90后职场女性，说话亲切幽默，喜欢用接地气的例子..."
                        className="min-h-[120px]"
                      />
                    </div>
                    <DialogFooter className="flex gap-2">
                      <Button variant="outline" onClick={() => setShowPersonaDialog(false)}>
                        取消
                      </Button>
                      <Button
                        onClick={() => {
                          if (customPersona.trim()) {
                            setPersonaType('custom');
                            setShowPersonaDialog(false);
                          }
                        }}
                        className="bg-gradient-to-r from-rose-500 to-pink-500"
                      >
                        确认人设
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* 补充要求自定义弹窗 */}
                <Dialog open={showRequirementDialog} onOpenChange={setShowRequirementDialog}>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Edit3 className="w-4 h-4" />
                        添加自定义要求
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                      <p className="text-sm text-gray-600">
                        请输入您对创作内容的额外要求：
                      </p>
                      <Textarea
                        value={customRequirement}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCustomRequirement(e.target.value)}
                        placeholder="例如：增加互动性提问、使用网络流行语..."
                        className="min-h-[80px]"
                      />
                    </div>
                    <DialogFooter className="flex gap-2">
                      <Button variant="outline" onClick={() => setShowRequirementDialog(false)}>
                        取消
                      </Button>
                      <Button
                        onClick={() => {
                          if (customRequirement.trim()) {
                            setShowRequirementDialog(false);
                          }
                        }}
                        className="bg-gradient-to-r from-purple-500 to-indigo-500"
                      >
                        添加要求
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            )}

            {/* Step 2: 标题选择 */}
            {step === 'titles' && (
              <Card className="mb-4 border border-rose-200 bg-gradient-to-br from-rose-50 to-pink-50">
                <CardHeader className="pb-2 pt-3 px-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold text-gray-800">
                      选择标题
                    </CardTitle>
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => {
                          handleGenerateTitles();
                        }}
                        className="h-7 px-2 text-xs"
                      >
                        <RefreshCw className="w-3 h-3 mr-1" />
                        换一批
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setStep('input')}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="space-y-2">
                    {generatedTitles.map((item, index) => (
                      <div 
                        key={index}
                        className={`relative p-4 rounded-xl transition-all cursor-pointer group ${
                          selectedTitleIndex === index
                            ? 'bg-white border-2 border-rose-500 shadow-md'
                            : 'bg-white/50 hover:bg-white border border-gray-200'
                        }`}
                        onClick={() => {
                          // 如果选了不同的标题，清除已有内容
                          if (selectedTitleIndex !== index && content) {
                            setContent('');
                            setEditableContent('');
                            setVideoScript(null);
                            setTags([]);
                            setImagePrompt('');
                          }
                          setSelectedTitleIndex(index);
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 ${
                            selectedTitleIndex === index
                              ? 'bg-rose-500 text-white'
                              : 'bg-gray-200 text-gray-600'
                          }`}>
                            {index + 1}
                          </span>
                          <span className="text-sm text-gray-700 flex-1">{item.title}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 transition-opacity h-7 px-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(item.title).then(() => {
                                toast.success('标题已复制');
                              });
                            }}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 生成内容按钮 */}
                  <Button
                    onClick={handleGenerateContent}
                    disabled={isGenerating || selectedTitleIndex === null}
                    className="w-full mt-4 h-12 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {currentStep || '生成中...'}
                      </>
                    ) : (
                      <>
                        <Rocket className="w-4 h-4 mr-2" />
                        生成内容
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Step 3: 内容生成中 */}
            {step === 'content' && isGenerating && (
              <Card className="mb-4 border border-rose-200 bg-gradient-to-br from-rose-50 to-pink-50">
                <CardContent className="p-6">
                  <div className="flex flex-col items-center justify-center py-8">
                    <Loader2 className="w-10 h-10 animate-spin text-rose-500 mb-4" />
                    <p className="text-sm text-gray-600">{currentStep || '正在生成...'}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 当前步骤提示 */}
            {isGenerating && currentStep && step === 'content' && (
              <div className="mt-4 p-3 bg-blue-50 rounded-xl border border-blue-200 flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                <span className="text-sm text-blue-600">{currentStep}</span>
              </div>
            )}
          </div>

          {/* 右侧：输出预览 */}
          {viewMode === 'split' && (
            <div className="space-y-4">
              {/* 返回整合视图 */}
              {step === 'content' && content && (
                <Button variant="outline" onClick={() => setStep('titles')} className="w-full">
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  返回标题选择
                </Button>
              )}

              {/* 内容预览 */}
              {content && (
                <Card className="border-0 shadow-lg bg-white/90">
                  <CardHeader className="pb-2 pt-3 px-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-bold text-gray-800 flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        生成内容
                      </CardTitle>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => {
                            if (isEditing) {
                              // 保存编辑内容
                              setContent(editableContent);
                              setIsEditing(false);
                              setUserEdited(true);
                            } else {
                              setIsEditing(true);
                            }
                          }}
                        >
                          {isEditing ? <Save className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={handleCopyContent}>
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    {isEditing ? (
                      <Textarea
                        value={editableContent}
                        onChange={(e) => {
                          setEditableContent(e.target.value);
                          setUserEdited(true);
                        }}
                        className="min-h-[400px] border-rose-200"
                      />
                    ) : (
                      <div className="prose prose-sm max-w-none">
                        <div className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">
                          {content}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* 视频脚本预览 */}
              {videoScript && (
                <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-indigo-50">
                  <CardHeader className="pb-2 pt-3 px-4">
                    <CardTitle className="text-sm font-bold text-gray-800 flex items-center gap-2">
                      <Video className="w-4 h-4 text-purple-500" />
                      视频脚本
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 space-y-4">
                    {/* 黄金3秒钩子 */}
                    <div className="p-3 bg-white rounded-xl border border-purple-200">
                      <p className="text-xs font-medium text-purple-600 mb-1">🎬 黄金3秒钩子</p>
                      <p className="text-sm text-gray-700">{videoScript.hook}</p>
                    </div>

                    {/* 分镜脚本 */}
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-gray-500">分镜脚本</p>
                      {videoScript.segments.map((seg, i) => (
                        <div key={i} className="p-3 bg-white rounded-xl border border-gray-200">
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="outline" className="text-xs">镜头 {i + 1}</Badge>
                            <span className="text-xs text-gray-400">{seg.duration}</span>
                          </div>
                          <p className="text-xs text-gray-500 mb-1">📷 画面：{seg.visual}</p>
                          <p className="text-sm text-gray-700">🎤 口播：{seg.voiceover}</p>
                        </div>
                      ))}
                    </div>

                    {/* 行动号召 */}
                    <div className="p-3 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-xl text-white">
                      <p className="text-xs font-medium mb-1">📢 行动号召 (CTA)</p>
                      <p className="text-sm">{videoScript.cta}</p>
                    </div>

                    {/* BGM推荐 */}
                    {videoScript.bgm && (
                      <div className="p-3 bg-gradient-to-r from-pink-50 to-rose-50 rounded-xl border border-pink-200">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">🎵</span>
                          <p className="text-xs font-medium text-pink-600">BGM推荐</p>
                        </div>
                        <p className="text-xs text-gray-600 mb-1">🎧 {videoScript.bgm.name}</p>
                        <p className="text-xs text-gray-500">💡 {videoScript.bgm.reason}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* 生图口令 */}
              {imagePrompt && (
                <Card className="border-0 shadow-lg bg-gradient-to-r from-indigo-50 to-purple-50">
                  <CardHeader className="pb-2 pt-3 px-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-bold text-gray-800 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-purple-500" />
                        AI生图口令
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(imagePrompt).then(() => {
                            toast.success('生图口令已复制！');
                          });
                        }}
                        className="h-7 px-2 text-xs"
                      >
                        <Copy className="w-3 h-3 mr-1" />
                        复制
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          // 调用API重新生成生图口令
                          fetch('/api/regenerate-image-prompt', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              title: selectedTitleIndex !== null ? generatedTitles[selectedTitleIndex]?.title : undefined,
                              content: content,
                              keywords: keywords,
                            }),
                          }).then(res => res.json()).then(data => {
                            if (data.prompt) {
                              setImagePrompt(data.prompt);
                              toast.success('已生成新的生图口令');
                            }
                          }).catch(() => {
                            toast.error('生成失败，请重试');
                          });
                        }}
                        className="h-7 px-2 text-xs"
                      >
                        <RefreshCw className="w-3 h-3 mr-1" />
                        换一批
                      </Button>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-1">
                      比例3:4，支持Midjourney、DALL-E、Seedance等AI绘图工具
                    </p>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="p-3 bg-white rounded-lg border border-purple-200">
                      <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">
                        {imagePrompt}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 标签 */}
              {tags.length > 0 && (
                <Card className="border-0 shadow-lg bg-white/90">
                  <CardHeader className="pb-2 pt-3 px-4">
                    <CardTitle className="text-sm font-bold text-gray-800 flex items-center gap-2">
                      <Tag className="w-4 h-4" />
                      推荐标签
                      <span className="text-[10px] text-gray-400 font-normal">（{tags.length}/10）</span>
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const tagsText = tags.map(t => `#${t}`).join(' ');
                        navigator.clipboard.writeText(tagsText).then(() => {
                          toast.success('标签已复制');
                        });
                      }}
                      className="h-7 px-2 text-xs"
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      复制
                    </Button>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag, i) => (
                        <Badge key={i} variant="secondary" className="bg-rose-100 text-rose-700">
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>

        {/* 整合视图 - 一键复制发布版 */}
        {viewMode === 'integrated' && (
          <Card className="mt-6 max-w-2xl mx-auto border-0 shadow-lg bg-white/90">
            <CardHeader className="pb-3 pt-4 px-5">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold text-gray-800 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-rose-500" />
                  {outputFormat === 'video' ? '视频脚本发布稿' : '图文发布稿'}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="default" 
                    size="sm" 
                    onClick={() => {
                      const textToCopy = outputFormat === 'video' 
                        ? generateVideoCopyText() 
                        : generateImageTextCopyText();
                      navigator.clipboard.writeText(textToCopy).then(() => {
                        toast.success('已复制到剪贴板，可直接发布！');
                      });
                    }}
                    className="bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600"
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    一键复制发布
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setStep('input');
                      setContent('');
                      setTags([]);
                      setImagePrompt('');
                      setCustomImagePrompt('');
                      setVideoScript(null);
                      setCompliance({ isCompliant: true, warnings: [] });
                      setIsEditing(false);
                      setUserEdited(false);
                    }}
                    className="text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {outputFormat === 'video' 
                  ? '标题 + 完整脚本 + BGM建议，点击即可复制完整发布稿' 
                  : '标题 + 正文内容 + 标签，可直接复制到小红书发布'}
              </p>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              {/* 图文模式 */}
              {outputFormat === 'image_text' && content && (
                <div className="space-y-4">
                  {/* 标题 */}
                  {selectedTitleIndex !== null && generatedTitles[selectedTitleIndex] && (
                    <div className="p-4 bg-gradient-to-r from-rose-50 to-pink-50 rounded-xl border border-rose-100">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-medium text-rose-500">📌 标题</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            // 随机换一个标题
                            const randomIndex = Math.floor(Math.random() * generatedTitles.length);
                            setSelectedTitleIndex(randomIndex);
                            // 清除内容，等待重新生成
                            setContent('');
                            setTags([]);
                            toast.success('已选择新标题，请重新生成内容');
                          }}
                          className="h-6 px-2 text-xs"
                        >
                          <RefreshCw className="w-3 h-3 mr-1" />
                          换一下
                        </Button>
                      </div>
                      <h3 className="text-lg font-bold text-gray-800">
                        {generatedTitles[selectedTitleIndex].title}
                      </h3>
                    </div>
                  )}
                  
                  {/* 正文内容 */}
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium text-gray-500">📝 正文内容</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (selectedTitleIndex !== null) {
                            handleRegenerateContent();
                          }
                        }}
                        className="h-6 px-2 text-xs"
                      >
                        <RefreshCw className="w-3 h-3 mr-1" />
                        换一下
                      </Button>
                    </div>
                    <div className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">
                      {content}
                    </div>
                  </div>
                  
                  {/* 标签 */}
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium text-gray-500">🏷️ 话题标签</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          handleRegenerateTags();
                        }}
                        className="h-6 px-2 text-xs"
                      >
                        <RefreshCw className="w-3 h-3 mr-1" />
                        换一下
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag, i) => (
                        <Badge key={i} variant="secondary" className="bg-rose-100 text-rose-700">
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  {/* AI生图 */}
                  <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-purple-100">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium text-purple-600">🎨 AI生图</p>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => {
                          setIsGeneratingImage(true);
                          const promptToUse = customImagePrompt || imagePrompt;
                          fetch('/api/image-generate', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ prompt: promptToUse }),
                          })
                            .then(res => res.json())
                            .then(data => {
                              if (data.success && data.imageUrls?.[0]) {
                                setGeneratedImageUrl(data.imageUrls[0]);
                                toast.success('图片生成成功！');
                              } else {
                                toast.error(data.error || '生成失败，请重试');
                              }
                            })
                            .catch(() => toast.error('生成失败'))
                            .finally(() => setIsGeneratingImage(false));
                        }}
                        disabled={isGeneratingImage || (!imagePrompt && !customImagePrompt)}
                        className="h-6 px-3 text-xs bg-gradient-to-r from-purple-500 to-indigo-500"
                      >
                        {isGeneratingImage ? (
                          <>
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            生成中
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3 h-3 mr-1" />
                            直接生成
                          </>
                        )}
                      </Button>
                    </div>
                    
                    {/* 生成结果 */}
                    {generatedImageUrl && (
                      <div className="mt-3">
                        <img src={generatedImageUrl} alt="生成的配图" className="rounded-lg w-full" />
                      </div>
                    )}
                    
                    {/* 生图口令 */}
                    <div className="mt-3">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-[10px] text-gray-500">AI生图口令</p>
                        {content && (
                          <Badge variant="outline" className="text-[8px] h-4 px-1 bg-emerald-50">
                            基于正文生成
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          value={customImagePrompt || imagePrompt}
                          onChange={(e) => setCustomImagePrompt(e.target.value)}
                          placeholder={imagePrompt || '输入自定义生图口令...'}
                          className="text-xs h-8"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const promptToCopy = customImagePrompt || imagePrompt;
                            if (promptToCopy) {
                              navigator.clipboard.writeText(promptToCopy).then(() => {
                                toast.success('生图口令已复制！');
                              });
                            }
                          }}
                          disabled={!imagePrompt && !customImagePrompt}
                          className="h-8 px-2"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            fetch('/api/regenerate-image-prompt', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                title: selectedTitleIndex !== null ? generatedTitles[selectedTitleIndex]?.title : undefined,
                                content: content,
                                keywords: keywords,
                              }),
                            })
                              .then(res => res.json())
                              .then(data => {
                                if (data.prompt) {
                                  setImagePrompt(data.prompt);
                                  setCustomImagePrompt('');
                                  toast.success('已生成新的生图口令');
                                }
                              })
                              .catch(() => toast.error('生成失败'));
                          }}
                          disabled={!content}
                          className="h-8 px-2"
                        >
                          <RefreshCw className="w-3 h-3" />
                        </Button>
                      </div>
                      {!customImagePrompt && imagePrompt && (
                        <p className="text-[10px] text-gray-400 mt-1">{imagePrompt}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 视频脚本模式 */}
              {outputFormat === 'video' && videoScript && (
                <div className="space-y-4">
                  {/* 标题 */}
                  <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl">
                    <p className="text-xs font-medium text-purple-600 mb-2">📌 视频标题</p>
                    <p className="text-base font-bold text-gray-800">{selectedTitleIndex !== null && generatedTitles[selectedTitleIndex] ? generatedTitles[selectedTitleIndex].title : ''}</p>
                  </div>

                  {/* 完整脚本 */}
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-xs font-medium text-gray-500 mb-2">🎬 完整视频脚本</p>
                    <div className="space-y-3 text-sm text-gray-700">
                      {/* 黄金钩子 */}
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <p className="text-xs text-purple-600 mb-1">【黄金3秒钩子】</p>
                        <p>{videoScript.hook}</p>
                      </div>
                      {/* 分镜 */}
                      {videoScript.segments.map((seg, i) => (
                        <div key={i} className="p-2 border border-gray-200 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">【镜头{i + 1}】{seg.duration}</p>
                          <p className="mb-1"><span className="text-gray-400">📷</span> {seg.visual}</p>
                          <p><span className="text-gray-400">🎤</span> {seg.voiceover}</p>
                        </div>
                      ))}
                      {/* CTA */}
                      <div className="p-2 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-lg text-white">
                        <p className="text-xs mb-1">【结尾CTA】</p>
                        <p>{videoScript.cta}</p>
                      </div>
                    </div>
                  </div>

                  {/* BGM推荐 */}
                  {videoScript.bgm && (
                    <div className="p-4 bg-gradient-to-r from-pink-50 to-rose-50 rounded-xl">
                      <p className="text-xs font-medium text-pink-600 mb-2">🎵 BGM推荐</p>
                      <p className="text-sm text-gray-700 mb-1">🎧 {videoScript.bgm.name}</p>
                      <p className="text-xs text-gray-500">{videoScript.bgm.reason}</p>
                    </div>
                  )}

                  {/* 标签 */}
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-xs font-medium text-gray-500 mb-2">🏷️ 话题标签</p>
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag, i) => (
                        <Badge key={i} variant="secondary" className="bg-rose-100 text-rose-700">
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>

      {/* 历史记录弹窗 */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <History className="w-4 h-4 text-rose-500" />
              历史记录
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto min-h-0 space-y-2 py-2">
            {historyLoading ? (
              <div className="flex items-center justify-center py-10 text-gray-400">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                加载中...
              </div>
            ) : historyRecords.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm">
                暂无历史记录
              </div>
            ) : (
              historyRecords.map(record => (
                <div
                  key={record.id}
                  className="group relative border rounded-lg p-3 hover:border-rose-200 hover:bg-rose-50/30 transition-colors cursor-pointer"
                  onClick={() => viewHistoryRecord(record)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-gray-800 truncate">{record.title}</h4>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{record.content}</p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {record.scene && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {SCENE_OPTIONS.find(s => s.value === record.scene)?.label || record.scene}
                          </Badge>
                        )}
                        {record.persona && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {PERSONA_OPTIONS.find(p => p.value === record.persona)?.label || record.persona}
                          </Badge>
                        )}
                        <span className="text-[10px] text-gray-400">
                          {new Date(record.created_at).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteHistory(record.id); }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
