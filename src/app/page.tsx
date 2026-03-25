'use client';

import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Sparkles, 
  RefreshCw, 
  Copy, 
  Download, 
  AlertTriangle,
  CheckCircle2,
  ImageIcon,
  FileText,
  Video,
  TrendingUp,
  Zap,
  Target,
  Users,
  PenTool,
  Hash,
  Shield,
  Loader2,
  Heart,
  Flame,
  Clock,
  ExternalLink,
  ChevronRight,
  Check,
  Settings,
  History,
  Bookmark,
  Trash2,
  Clock3,
  Lightbulb,
  User,
  Timer,
  Palette,
  RotateCcw
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  TopicType, 
  UserTag, 
  ContentType, 
  GenerateResult, 
  VideoDuration, 
  VideoStyle, 
  TitleStyle, 
  HotTopicTimeRange,
  HistoryRecord,
  ExportFormat
} from '@/lib/types';
import { 
  TOPIC_TYPE_OPTIONS, 
  USER_TAG_OPTIONS, 
  VIDEO_DURATION_OPTIONS,
  VIDEO_STYLE_OPTIONS,
  TITLE_STYLE_OPTIONS,
  HOT_TOPIC_TIME_RANGE_OPTIONS,
  USER_TAG_TOPIC_COMPATIBILITY,
  HOT_TOPIC_SUPPORTED,
  PERSONA_PRESETS
} from '@/lib/constants';

// 热点数据类型
interface HotTopic {
  id: number;
  title: string;
  source: string;
  snippet: string;
  url?: string;
  publishTime?: string;
  score?: number;
}

// 扩展GenerateResult包含更多字段
interface ExtendedGenerateResult extends GenerateResult {
  hotTopicsData?: Array<{title: string; score: number; snippet: string}>;
}

// 历史记录存储Key
const HISTORY_STORAGE_KEY = 'xhs_generator_history';
const MAX_HISTORY_RECORDS = 20;

export default function Home() {
  // 输入状态
  const [topicType, setTopicType] = useState<TopicType>('market_hot');
  const [userTag, setUserTag] = useState<UserTag>('beginner');
  const [contentType, setContentType] = useState<ContentType>('article');
  const [keywords, setKeywords] = useState('');
  const [useHotTopic, setUseHotTopic] = useState(true);
  
  // 新增参数状态
  const [videoDuration, setVideoDuration] = useState<VideoDuration>('60s');
  const [videoStyle, setVideoStyle] = useState<VideoStyle>('popular_science');
  const [titleStyle, setTitleStyle] = useState<TitleStyle | undefined>(undefined);
  const [hotTopicTimeRange, setHotTopicTimeRange] = useState<HotTopicTimeRange>('24h');
  const [personaKeywords, setPersonaKeywords] = useState('');
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  // 输出状态
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<ExtendedGenerateResult | null>(null);
  const [streamingContent, setStreamingContent] = useState('');
  const [currentStep, setCurrentStep] = useState<string>('');
  const [hotTopicInfo, setHotTopicInfo] = useState<string>('');
  
  // 模块化生成状态
  const [isRegeneratingTitle, setIsRegeneratingTitle] = useState(false);
  const [isRegeneratingContent, setIsRegeneratingContent] = useState(false);
  const [isRegeneratingTags, setIsRegeneratingTags] = useState(false);
  
  // 多图选择状态
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);

  // 热点榜状态
  const [hotTopics, setHotTopics] = useState<HotTopic[]>([]);
  const [hotTopicsSummary, setHotTopicsSummary] = useState<string>('');
  const [hotTopicsTime, setHotTopicsTime] = useState<string>('');
  const [isLoadingHotTopics, setIsLoadingHotTopics] = useState(false);
  const [showHotTopicsPanel, setShowHotTopicsPanel] = useState(false);
  const [hotTopicsData, setHotTopicsData] = useState<Array<{title: string; score: number; snippet: string}>>([]);

  // 自定义图片prompt状态
  const [customImagePrompt, setCustomImagePrompt] = useState('');
  const [isRegeneratingImages, setIsRegeneratingImages] = useState(false);
  const [showCustomPromptInput, setShowCustomPromptInput] = useState(false);

  // 历史记录状态
  const [historyRecords, setHistoryRecords] = useState<HistoryRecord[]>([]);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);

  // 检查选项兼容性
  const isTopicCompatible = USER_TAG_TOPIC_COMPATIBILITY[userTag].includes(topicType);
  const isHotTopicSupported = HOT_TOPIC_SUPPORTED.includes(topicType);
  const isVideo = contentType === 'video_script';

  // 从本地存储加载历史记录
  useEffect(() => {
    try {
      const saved = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (saved) {
        setHistoryRecords(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load history:', e);
    }
  }, []);

  // 保存历史记录
  const saveToHistory = useCallback((newResult: ExtendedGenerateResult) => {
    const record: HistoryRecord = {
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      params: {
        topicType,
        userTag,
        contentType,
        keywords,
        useHotTopic,
        videoDuration,
        videoStyle,
        titleStyle,
        personaKeywords,
        hotTopicTimeRange,
      },
      result: newResult,
      isFavorite: false,
    };

    const updatedRecords = [record, ...historyRecords].slice(0, MAX_HISTORY_RECORDS);
    setHistoryRecords(updatedRecords);
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updatedRecords));
  }, [topicType, userTag, contentType, keywords, useHotTopic, videoDuration, videoStyle, titleStyle, personaKeywords, hotTopicTimeRange, historyRecords]);

  // 获取热点榜
  const fetchHotTopics = useCallback(async () => {
    setIsLoadingHotTopics(true);
    try {
      const response = await fetch('/api/hot-topics');
      const data = await response.json();
      setHotTopics(data.topics || []);
      setHotTopicsSummary(data.summary || '');
      setHotTopicsTime(data.updateTime || '');
    } catch (error) {
      console.error('Fetch hot topics error:', error);
    } finally {
      setIsLoadingHotTopics(false);
    }
  }, []);

  // 页面加载时获取热点
  useEffect(() => {
    fetchHotTopics();
  }, [fetchHotTopics]);

  // 处理用户标签变化
  const handleUserTagChange = (value: UserTag) => {
    setUserTag(value);
    if (!USER_TAG_TOPIC_COMPATIBILITY[value].includes(topicType)) {
      setTopicType(USER_TAG_TOPIC_COMPATIBILITY[value][0]);
    }
  };

  // 主生成函数
  const handleGenerate = useCallback(async () => {
    if (!isTopicCompatible) {
      toast.error('选题类型与用户标签不兼容');
      return;
    }

    setIsGenerating(true);
    setStreamingContent('');
    setResult(null);
    setImageUrls([]);
    setSelectedImageIndex(0);
    setCurrentStep('准备中...');

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicType,
          userTag,
          contentType,
          keywords,
          useHotTopic: useHotTopic && isHotTopicSupported,
          videoDuration,
          videoStyle,
          titleStyle,
          personaKeywords,
          hotTopicTimeRange,
        }),
      });

      if (!response.ok) {
        throw new Error('生成失败');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        let accumulatedResult: ExtendedGenerateResult = {
          title: '',
          content: '',
          tags: [],
          complianceCheck: { isCompliant: true, warnings: [], suggestions: [] },
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                
                if (data.type === 'status') {
                  setCurrentStep(data.data);
                } else if (data.type === 'title') {
                  accumulatedResult.title = data.data;
                  accumulatedResult.titleStyle = data.titleStyle;
                } else if (data.type === 'content') {
                  accumulatedResult.content += data.data;
                  setStreamingContent(accumulatedResult.content);
                } else if (data.type === 'tags') {
                  accumulatedResult.tags = data.data;
                } else if (data.type === 'images') {
                  setImageUrls(data.data);
                } else if (data.type === 'image') {
                  if (data.data) {
                    setImageUrls([data.data]);
                  }
                } else if (data.type === 'hot_topics_data') {
                  setHotTopicsData(data.data);
                } else if (data.type === 'compliance') {
                  accumulatedResult.complianceCheck = data.data;
                  setCurrentStep('');
                }
              } catch (e) {
                // 忽略解析错误
              }
            }
          }
        }

        setResult(accumulatedResult);
        saveToHistory(accumulatedResult);
        toast.success('内容生成完成！');
      }
    } catch (error) {
      console.error('生成错误:', error);
      toast.error('生成失败，请检查API配置后重试');
    } finally {
      setIsGenerating(false);
    }
  }, [topicType, userTag, contentType, keywords, useHotTopic, isTopicCompatible, isHotTopicSupported, videoDuration, videoStyle, titleStyle, personaKeywords, hotTopicTimeRange, saveToHistory]);

  // 模块化：单独刷新标题
  const handleRegenerateTitle = useCallback(async () => {
    if (!result) return;
    
    setIsRegeneratingTitle(true);
    try {
      const response = await fetch('/api/generate-title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicType,
          userTag,
          contentType,
          keywords,
          hotTopicInfo,
          titleStyle,
          personaKeywords,
          previousTitle: result.title,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setResult(prev => prev ? { ...prev, title: data.title, titleStyle: data.titleStyle } : null);
        toast.success('标题已更新！');
      } else {
        toast.error(data.error || '标题生成失败');
      }
    } catch (error) {
      console.error('Regenerate title error:', error);
      toast.error('标题生成失败');
    } finally {
      setIsRegeneratingTitle(false);
    }
  }, [result, topicType, userTag, contentType, keywords, hotTopicInfo, titleStyle, personaKeywords]);

  // 模块化：单独刷新正文
  const handleRegenerateContent = useCallback(async () => {
    if (!result) return;
    
    setIsRegeneratingContent(true);
    setStreamingContent('');
    
    try {
      const response = await fetch('/api/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicType,
          userTag,
          contentType,
          keywords,
          hotTopicInfo,
          title: result.title,
          videoDuration,
          videoStyle,
          personaKeywords,
        }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        let newContent = '';
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === 'content') {
                  newContent += data.data;
                  setStreamingContent(newContent);
                }
              } catch (e) {
                // 忽略解析错误
              }
            }
          }
        }

        setResult(prev => prev ? { ...prev, content: newContent } : null);
        toast.success('正文已更新！');
      }
    } catch (error) {
      console.error('Regenerate content error:', error);
      toast.error('正文生成失败');
    } finally {
      setIsRegeneratingContent(false);
    }
  }, [result, topicType, userTag, contentType, keywords, hotTopicInfo, videoDuration, videoStyle, personaKeywords]);

  // 模块化：单独刷新标签
  const handleRegenerateTags = useCallback(async () => {
    if (!result) return;
    
    setIsRegeneratingTags(true);
    try {
      const response = await fetch('/api/generate-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicType,
          keywords,
          title: result.title,
          content: result.content,
          previousTags: result.tags,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setResult(prev => prev ? { ...prev, tags: data.tags } : null);
        toast.success('标签已更新！');
      } else {
        toast.error(data.error || '标签生成失败');
      }
    } catch (error) {
      console.error('Regenerate tags error:', error);
      toast.error('标签生成失败');
    } finally {
      setIsRegeneratingTags(false);
    }
  }, [result, topicType, keywords]);

  // 重新生成配图
  const handleRegenerateImages = useCallback(async (prompt?: string) => {
    const usePrompt = prompt || customImagePrompt;
    
    if (!usePrompt || usePrompt.trim().length === 0) {
      toast.error('请输入图片描述');
      return;
    }

    setIsRegeneratingImages(true);
    setSelectedImageIndex(0);

    try {
      const response = await fetch('/api/regenerate-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: usePrompt, count: 4 }),
      });

      const data = await response.json();

      if (data.success && data.imageUrls.length > 0) {
        setImageUrls(data.imageUrls);
        toast.success(`已生成 ${data.imageUrls.length} 张新配图`);
        setCustomImagePrompt('');
      } else {
        toast.error(data.error || '图片生成失败');
      }
    } catch (error) {
      console.error('Regenerate images error:', error);
      toast.error('图片生成失败，请重试');
    } finally {
      setIsRegeneratingImages(false);
    }
  }, [customImagePrompt]);

  // 复制内容
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('已复制到剪贴板');
  };

  // 导出内容
  const handleExport = useCallback((format: ExportFormat = 'txt') => {
    if (!result) return;
    
    const selectedImage = imageUrls[selectedImageIndex];
    let content = '';
    let filename = '';
    let mimeType = 'text/plain';
    
    switch (format) {
      case 'json':
        content = JSON.stringify({
          title: result.title,
          content: result.content,
          tags: result.tags,
          imageUrl: selectedImage,
          complianceCheck: result.complianceCheck,
          createdAt: new Date().toISOString(),
        }, null, 2);
        filename = `小红书内容_${new Date().toISOString().split('T')[0]}.json`;
        mimeType = 'application/json';
        break;
        
      case 'csv':
        const csvContent = [
          '字段,内容',
          `标题,"${result.title}"`,
          `正文,"${result.content.replace(/"/g, '""')}"`,
          `标签,"${result.tags.join(' ')}"`,
          selectedImage ? `配图链接,"${selectedImage}"` : '',
          result.complianceCheck.warnings.length > 0 ? `合规提醒,"${result.complianceCheck.warnings.join('; ')}"` : '',
        ].filter(Boolean).join('\n');
        content = csvContent;
        filename = `小红书内容_${new Date().toISOString().split('T')[0]}.csv`;
        mimeType = 'text/csv';
        break;
        
      case 'script':
        // 视频脚本格式
        content = `【视频脚本】
标题：${result.title}

${result.content}

---
标签：${result.tags.map(t => '#' + t).join(' ')}
${selectedImage ? `配图：${selectedImage}` : ''}
${result.complianceCheck.warnings.length > 0 ? `\n⚠️ 合规提醒：\n${result.complianceCheck.warnings.join('\n')}` : ''}
`;
        filename = `视频脚本_${new Date().toISOString().split('T')[0]}.txt`;
        break;
        
      default: // txt
        content = `标题：${result.title}\n\n正文：\n${result.content}\n\n标签：${result.tags.map(t => '#' + t).join(' ')}\n\n${selectedImage ? `配图链接：${selectedImage}\n\n` : ''}${result.complianceCheck.warnings.length > 0 ? '合规提醒：\n' + result.complianceCheck.warnings.join('\n') : ''}`;
        filename = `小红书内容_${new Date().toISOString().split('T')[0]}.txt`;
    }
    
    const blob = new Blob([content], { type: mimeType + ';charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('已导出文件');
  }, [result, imageUrls, selectedImageIndex]);

  // 选择图片
  const handleSelectImage = (index: number) => {
    setSelectedImageIndex(index);
    toast.success('已选择该配图');
  };

  // 加载历史记录
  const handleLoadHistory = (record: HistoryRecord) => {
    setTopicType(record.params.topicType);
    setUserTag(record.params.userTag);
    setContentType(record.params.contentType);
    setKeywords(record.params.keywords || '');
    setUseHotTopic(record.params.useHotTopic ?? true);
    setVideoDuration(record.params.videoDuration || '60s');
    setVideoStyle(record.params.videoStyle || 'popular_science');
    setTitleStyle(record.params.titleStyle);
    setPersonaKeywords(record.params.personaKeywords || '');
    setHotTopicTimeRange(record.params.hotTopicTimeRange || '24h');
    setResult(record.result);
    setImageUrls(record.result.imageUrls || []);
    setShowHistoryPanel(false);
    toast.success('已加载历史记录');
  };

  // 删除历史记录
  const handleDeleteHistory = (id: string) => {
    const updatedRecords = historyRecords.filter(r => r.id !== id);
    setHistoryRecords(updatedRecords);
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updatedRecords));
    toast.success('已删除');
  };

  // 清空历史记录
  const handleClearHistory = () => {
    setHistoryRecords([]);
    localStorage.removeItem(HISTORY_STORAGE_KEY);
    toast.success('历史记录已清空');
  };

  // 切换收藏
  const handleToggleFavorite = (id: string) => {
    const updatedRecords = historyRecords.map(r => 
      r.id === id ? { ...r, isFavorite: !r.isFavorite } : r
    );
    setHistoryRecords(updatedRecords);
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updatedRecords));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-orange-50">
      {/* 装饰背景 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-pink-200 to-rose-200 rounded-full opacity-30 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-orange-200 to-amber-200 rounded-full opacity-30 blur-3xl" />
      </div>

      <div className="relative container mx-auto px-4 py-6 max-w-7xl">
        {/* 头部 */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-gradient-to-br from-rose-500 to-pink-500 rounded-xl shadow-lg shadow-rose-500/30">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-rose-600 via-pink-600 to-orange-500 bg-clip-text text-transparent">
              小红书AI爆款内容生成器
            </h1>
          </div>
          <p className="text-gray-600">
            基于AI大模型，智能生成符合金融合规要求的爆款内容
            <span className="inline-flex items-center gap-1 ml-2 text-rose-500">
              <Sparkles className="h-4 w-4" />
              专业版
            </span>
          </p>
        </div>

        {/* 顶部操作栏 */}
        <div className="flex justify-center gap-3 mb-4">
          <Button
            variant="outline"
            onClick={() => {
              setShowHotTopicsPanel(!showHotTopicsPanel);
              if (!showHotTopicsPanel) fetchHotTopics();
            }}
            className="border-rose-200 text-rose-600 hover:bg-rose-50"
          >
            <Flame className="h-4 w-4 mr-2" />
            {showHotTopicsPanel ? '收起热点榜' : '今日财经热点榜'}
            <ChevronRight className={`h-4 w-4 ml-2 transition-transform ${showHotTopicsPanel ? 'rotate-90' : ''}`} />
          </Button>
          
          <Button
            variant="outline"
            onClick={() => setShowHistoryPanel(!showHistoryPanel)}
            className="border-violet-200 text-violet-600 hover:bg-violet-50"
          >
            <History className="h-4 w-4 mr-2" />
            {showHistoryPanel ? '收起历史' : '历史记录'}
            {historyRecords.length > 0 && (
              <Badge className="ml-2 bg-violet-100 text-violet-700 border-0">{historyRecords.length}</Badge>
            )}
          </Button>
        </div>

        {/* 历史记录面板 */}
        {showHistoryPanel && (
          <Card className="mb-6 border-0 shadow-xl shadow-violet-500/10 bg-white/90 backdrop-blur-sm overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-400 via-purple-400 to-fuchsia-400" />
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <History className="h-5 w-5 text-violet-500" />
                  历史记录
                </CardTitle>
                {historyRecords.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={handleClearHistory} className="text-red-500 hover:text-red-600">
                    <Trash2 className="h-4 w-4 mr-1" />
                    清空
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {historyRecords.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  暂无历史记录
                </div>
              ) : (
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {historyRecords.map((record) => (
                      <div
                        key={record.id}
                        className="flex items-start gap-3 p-2 rounded-lg hover:bg-violet-50 transition-colors group"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-800 truncate text-sm">
                            {record.result.title}
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
                            <Clock3 className="h-3 w-3" />
                            {new Date(record.createdAt).toLocaleString()}
                            <Badge variant="outline" className="text-xs h-4">
                              {record.params.contentType === 'article' ? '图文' : '视频'}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleFavorite(record.id)}
                            className="h-7 w-7 p-0"
                          >
                            <Bookmark className={`h-4 w-4 ${record.isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}`} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleLoadHistory(record)}
                            className="h-7 text-xs text-violet-600"
                          >
                            加载
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteHistory(record.id)}
                            className="h-7 w-7 p-0 text-red-400 hover:text-red-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        )}

        {/* 热点榜面板 */}
        {showHotTopicsPanel && (
          <Card className="mb-6 border-0 shadow-xl shadow-orange-500/10 bg-white/90 backdrop-blur-sm overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-400 via-red-400 to-pink-400" />
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Flame className="h-5 w-5 text-orange-500" />
                  今日财经热点榜
                </CardTitle>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Clock className="h-4 w-4" />
                  {hotTopicsTime && `更新于 ${hotTopicsTime}`}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={fetchHotTopics}
                    disabled={isLoadingHotTopics}
                    className="ml-2"
                  >
                    <RefreshCw className={`h-4 w-4 ${isLoadingHotTopics ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingHotTopics ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
                  <span className="ml-2 text-gray-500">正在获取热点...</span>
                </div>
              ) : hotTopics.length > 0 ? (
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {hotTopics.map((topic, index) => (
                      <div
                        key={topic.id}
                        className="flex items-start gap-3 p-2 rounded-lg hover:bg-orange-50 transition-colors cursor-pointer group"
                        onClick={() => {
                          setKeywords(topic.title.substring(0, 20));
                          toast.success('已填入关键词');
                        }}
                      >
                        <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${
                          index < 3 ? 'bg-gradient-to-br from-orange-400 to-red-500 text-white' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {topic.id}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-800 truncate group-hover:text-orange-600">
                            {topic.title}
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5">
                            {topic.source} · {topic.snippet.substring(0, 50)}...
                          </div>
                        </div>
                        {topic.score && (
                          <Badge className="bg-orange-100 text-orange-700 border-0 text-xs">
                            热度 {topic.score}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  暂无热点数据
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左侧：输入模块 */}
          <div className="space-y-4">
            {/* 选题类型卡片 */}
            <Card className="border-0 shadow-xl shadow-rose-500/10 bg-white/80 backdrop-blur-sm overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 via-pink-500 to-orange-400" />
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <div className="p-1.5 bg-rose-100 rounded-lg">
                    <Target className="h-4 w-4 text-rose-600" />
                  </div>
                  选题类型
                </CardTitle>
                <CardDescription className="text-xs">选择内容方向，精准定位目标受众</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {TOPIC_TYPE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setTopicType(option.value)}
                      className={`p-3 rounded-xl border-2 text-left transition-all duration-200 ${
                        topicType === option.value
                          ? 'border-rose-400 bg-gradient-to-br from-rose-50 to-pink-50 shadow-md shadow-rose-500/10'
                          : 'border-gray-100 hover:border-rose-200 hover:bg-rose-50/50'
                      }`}
                    >
                      <div className="font-semibold text-gray-800 text-sm">{option.label}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{option.description}</div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 用户标签卡片 */}
            <Card className="border-0 shadow-xl shadow-rose-500/10 bg-white/80 backdrop-blur-sm overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-pink-500 via-rose-500 to-red-400" />
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <div className="p-1.5 bg-pink-100 rounded-lg">
                    <Users className="h-4 w-4 text-pink-600" />
                  </div>
                  目标用户
                </CardTitle>
                <CardDescription className="text-xs">确定受众群体，生成更精准的内容</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2">
                  {USER_TAG_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleUserTagChange(option.value)}
                      className={`p-2.5 rounded-xl border-2 text-center transition-all duration-200 ${
                        userTag === option.value
                          ? 'border-pink-400 bg-gradient-to-br from-pink-50 to-rose-50 shadow-md shadow-pink-500/10'
                          : 'border-gray-100 hover:border-pink-200 hover:bg-pink-50/50'
                      }`}
                    >
                      <div className="font-semibold text-gray-800 text-xs mb-0.5">{option.label}</div>
                      <div className="text-xs text-gray-500 truncate">{option.description}</div>
                    </button>
                  ))}
                </div>
                {!isTopicCompatible && (
                  <div className="flex items-center gap-2 text-amber-600 text-xs mt-2 p-2 bg-amber-50 rounded-lg border border-amber-200">
                    <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                    <span>已自动调整选题类型以匹配用户标签</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 内容类型和设置 */}
            <Card className="border-0 shadow-xl shadow-rose-500/10 bg-white/80 backdrop-blur-sm overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-400" />
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <div className="p-1.5 bg-orange-100 rounded-lg">
                    <PenTool className="h-4 w-4 text-orange-600" />
                  </div>
                  内容设置
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* 内容类型 */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setContentType('article')}
                    className={`p-3 rounded-xl border-2 flex items-center gap-2 transition-all duration-200 ${
                      contentType === 'article'
                        ? 'border-orange-400 bg-gradient-to-br from-orange-50 to-amber-50 shadow-md shadow-orange-500/10'
                        : 'border-gray-100 hover:border-orange-200 hover:bg-orange-50/50'
                    }`}
                  >
                    <FileText className={`h-4 w-4 ${contentType === 'article' ? 'text-orange-600' : 'text-gray-400'}`} />
                    <div className="text-left">
                      <div className="font-semibold text-gray-800 text-sm">图文内容</div>
                    </div>
                  </button>
                  <button
                    onClick={() => setContentType('video_script')}
                    className={`p-3 rounded-xl border-2 flex items-center gap-2 transition-all duration-200 ${
                      contentType === 'video_script'
                        ? 'border-orange-400 bg-gradient-to-br from-orange-50 to-amber-50 shadow-md shadow-orange-500/10'
                        : 'border-gray-100 hover:border-orange-200 hover:bg-orange-50/50'
                    }`}
                  >
                    <Video className={`h-4 w-4 ${contentType === 'video_script' ? 'text-orange-600' : 'text-gray-400'}`} />
                    <div className="text-left">
                      <div className="font-semibold text-gray-800 text-sm">视频脚本</div>
                    </div>
                  </button>
                </div>

                {/* 视频专用设置 */}
                {isVideo && (
                  <div className="space-y-3 p-3 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border border-orange-100">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
                          <Timer className="h-3 w-3" />
                          视频时长
                        </Label>
                        <Select value={videoDuration} onValueChange={(v) => setVideoDuration(v as VideoDuration)}>
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {VIDEO_DURATION_OPTIONS.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
                          <Palette className="h-3 w-3" />
                          视频风格
                        </Label>
                        <Select value={videoStyle} onValueChange={(v) => setVideoStyle(v as VideoStyle)}>
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {VIDEO_STYLE_OPTIONS.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}

                {/* 今日爆款推荐 */}
                {isHotTopicSupported && (
                  <div className="flex items-center justify-between p-3 bg-gradient-to-r from-rose-50 via-pink-50 to-orange-50 rounded-xl border border-rose-100">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-gradient-to-br from-rose-400 to-pink-500 rounded-lg shadow-md shadow-rose-500/30">
                        <Zap className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-800 text-sm">今日爆款推荐</div>
                        <div className="text-xs text-gray-500">AI自动捕捉实时热点</div>
                      </div>
                    </div>
                    <Switch
                      checked={useHotTopic}
                      onCheckedChange={setUseHotTopic}
                    />
                  </div>
                )}

                {/* 热点时间筛选 */}
                {useHotTopic && isHotTopicSupported && (
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-gray-600">热点时效：</Label>
                    <div className="flex gap-1">
                      {HOT_TOPIC_TIME_RANGE_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => setHotTopicTimeRange(opt.value)}
                          className={`px-2 py-1 rounded text-xs transition-all ${
                            hotTopicTimeRange === opt.value
                              ? 'bg-rose-500 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 关键词输入 */}
                <div>
                  <Label className="text-xs font-medium text-gray-700 mb-1 block">关键词（可选）</Label>
                  <Input
                    placeholder="输入关键词，或点击热点榜自动填入..."
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    className="border-gray-200 focus:border-rose-300 focus:ring-rose-200 h-9"
                  />
                </div>

                {/* 高级设置切换 */}
                <button
                  onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                  className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700 w-full justify-center py-1"
                >
                  <Settings className="h-3.5 w-3.5" />
                  {showAdvancedSettings ? '收起高级设置' : '展开高级设置'}
                  <ChevronRight className={`h-3.5 w-3.5 transition-transform ${showAdvancedSettings ? 'rotate-90' : ''}`} />
                </button>

                {/* 高级设置面板 */}
                {showAdvancedSettings && (
                  <div className="space-y-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                    {/* 标题风格选择 */}
                    <div>
                      <Label className="text-xs font-medium text-gray-700 mb-1.5 flex items-center gap-1">
                        <Lightbulb className="h-3 w-3 text-yellow-500" />
                        标题风格（可选）
                      </Label>
                      <div className="grid grid-cols-5 gap-1">
                        {TITLE_STYLE_OPTIONS.map(opt => (
                          <button
                            key={opt.value}
                            onClick={() => setTitleStyle(titleStyle === opt.value ? undefined : opt.value)}
                            className={`p-1.5 rounded text-xs transition-all border ${
                              titleStyle === opt.value
                                ? 'border-yellow-400 bg-yellow-50 text-yellow-700'
                                : 'border-gray-200 bg-white text-gray-600 hover:border-yellow-300'
                            }`}
                            title={opt.example}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 博主人设 */}
                    <div>
                      <Label className="text-xs font-medium text-gray-700 mb-1.5 flex items-center gap-1">
                        <User className="h-3 w-3 text-violet-500" />
                        博主人设（可选）
                      </Label>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {PERSONA_PRESETS.map(preset => (
                          <button
                            key={preset.label}
                            onClick={() => setPersonaKeywords(preset.keywords)}
                            className="px-2 py-1 rounded-full text-xs bg-violet-50 text-violet-600 hover:bg-violet-100 transition-colors"
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                      <Input
                        placeholder="或输入自定义人设关键词，如：专业、理性、幽默..."
                        value={personaKeywords}
                        onChange={(e) => setPersonaKeywords(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                )}

                {/* 生成按钮 */}
                <Button
                  className="w-full h-11 text-base font-semibold bg-gradient-to-r from-rose-500 via-pink-500 to-orange-500 hover:from-rose-600 hover:via-pink-600 hover:to-orange-600 shadow-lg shadow-rose-500/30 rounded-xl transition-all duration-300"
                  onClick={handleGenerate}
                  disabled={isGenerating || !isTopicCompatible}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {currentStep || 'AI生成中...'}
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      生成爆款内容
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
          {/* 右侧：输出模块 */}
          <Card className="border-0 shadow-xl shadow-rose-500/10 bg-white/80 backdrop-blur-sm overflow-hidden lg:sticky lg:top-4 lg:self-start">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500" />
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <div className="p-1.5 bg-violet-100 rounded-lg">
                    <PenTool className="h-4 w-4 text-violet-600" />
                  </div>
                  生成结果
                </CardTitle>
                {result && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleGenerate}
                      className="border-rose-200 text-rose-600 hover:bg-rose-50 h-7 text-xs"
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      全部重刷
                    </Button>
                  </div>
                )}
              </div>
              <CardDescription className="text-xs">AI生成的内容将在此展示，支持模块化单独刷新</CardDescription>
            </CardHeader>
            <CardContent>
              {!result && !streamingContent ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <div className="p-5 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl mb-3">
                    <ImageIcon className="h-12 w-12 text-gray-300" />
                  </div>
                  <p>点击"生成爆款内容"开始创作</p>
                  <p className="text-xs text-gray-300 mt-1">AI将为您生成标题、正文、标签和配图</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* 标题 */}
                  {result?.title && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                          <Sparkles className="h-3.5 w-3.5 text-rose-500" />
                          爆款标题
                          {result.titleStyle && (
                            <Badge className="bg-yellow-100 text-yellow-700 border-0 text-xs ml-1">
                              {TITLE_STYLE_OPTIONS.find(t => t.value === result.titleStyle)?.label}
                            </Badge>
                          )}
                        </Label>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleRegenerateTitle}
                            disabled={isRegeneratingTitle}
                            className="text-gray-400 hover:text-rose-500 h-6 text-xs"
                            title="换一个标题"
                          >
                            {isRegeneratingTitle ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <RefreshCw className="h-3.5 w-3.5" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopy(result.title)}
                            className="text-gray-400 hover:text-rose-500 h-6 w-6 p-0"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="p-3 bg-gradient-to-r from-rose-50 to-pink-50 rounded-lg border border-rose-100">
                        <div className="font-bold text-lg text-gray-800">{result.title}</div>
                      </div>
                    </div>
                  )}

                  {/* 正文 */}
                  {(result?.content || streamingContent) && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5 text-pink-500" />
                          {isVideo ? '视频脚本' : '正文内容'}
                        </Label>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleRegenerateContent}
                            disabled={isRegeneratingContent}
                            className="text-gray-400 hover:text-pink-500 h-6 text-xs"
                            title="换一篇正文"
                          >
                            {isRegeneratingContent ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <RefreshCw className="h-3.5 w-3.5" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopy(result?.content || streamingContent)}
                            className="text-gray-400 hover:text-pink-500 h-6 w-6 p-0"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <Textarea
                        value={result?.content || streamingContent}
                        readOnly
                        className={`min-h-[180px] resize-none border-gray-100 bg-gray-50/50 focus:bg-white text-gray-700 leading-relaxed text-sm ${
                          isVideo ? 'font-mono' : ''
                        }`}
                      />
                    </div>
                  )}

                  {/* 标签 */}
                  {result?.tags && result.tags.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                          <Hash className="h-3.5 w-3.5 text-orange-500" />
                          热门标签
                        </Label>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleRegenerateTags}
                            disabled={isRegeneratingTags}
                            className="text-gray-400 hover:text-orange-500 h-6 text-xs"
                            title="换一批标签"
                          >
                            {isRegeneratingTags ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <RefreshCw className="h-3.5 w-3.5" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopy(result.tags.map(t => '#' + t).join(' '))}
                            className="text-gray-400 hover:text-orange-500 h-6 w-6 p-0"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {result.tags.map((tag, index) => (
                          <Badge
                            key={index}
                            className="px-2.5 py-1 bg-gradient-to-r from-rose-100 to-pink-100 text-rose-700 border-0 hover:from-rose-200 hover:to-pink-200 font-medium text-xs"
                          >
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 配图选择 - 多图展示 */}
                  {imageUrls.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                          <ImageIcon className="h-3.5 w-3.5 text-violet-500" />
                          AI配图（点击选择）
                        </Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowCustomPromptInput(!showCustomPromptInput)}
                          className="text-xs text-violet-600 hover:text-violet-700 h-6 px-2"
                        >
                          <PenTool className="h-3 w-3 mr-1" />
                          自定义描述
                        </Button>
                      </div>
                      
                      {/* 自定义prompt输入框 */}
                      {showCustomPromptInput && (
                        <div className="space-y-2 p-3 bg-violet-50 rounded-lg border border-violet-100">
                          <div className="text-xs text-violet-600 font-medium">
                            描述你想要的配图风格（不会生成文字）：
                          </div>
                          <Textarea
                            placeholder="例如：一个温馨的咖啡馆场景，木质桌椅，阳光透过窗户洒进来..."
                            value={customImagePrompt}
                            onChange={(e) => setCustomImagePrompt(e.target.value)}
                            className="min-h-[60px] text-xs border-violet-200 focus:border-violet-300 focus:ring-violet-200"
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleRegenerateImages()}
                              disabled={isRegeneratingImages || !customImagePrompt.trim()}
                              className="flex-1 bg-violet-500 hover:bg-violet-600 text-white h-7 text-xs"
                            >
                              {isRegeneratingImages ? (
                                <>
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                  生成中...
                                </>
                              ) : (
                                <>
                                  <RefreshCw className="h-3 w-3 mr-1" />
                                  重新生成
                                </>
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setShowCustomPromptInput(false)}
                              className="h-7 text-xs border-violet-200 text-violet-600"
                            >
                              取消
                            </Button>
                          </div>
                        </div>
                      )}
                      
                      <div className="grid grid-cols-2 gap-2">
                        {imageUrls.map((url, index) => (
                          <div
                            key={index}
                            onClick={() => handleSelectImage(index)}
                            className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer transition-all duration-200 ${
                              selectedImageIndex === index 
                                ? 'ring-2 ring-rose-500 ring-offset-2 shadow-lg' 
                                : 'hover:ring-2 hover:ring-rose-300 hover:ring-offset-1'
                            }`}
                          >
                            <img
                              src={url}
                              alt={`配图 ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                            {selectedImageIndex === index && (
                              <div className="absolute top-1.5 right-1.5 bg-rose-500 rounded-full p-0.5">
                                <Check className="h-3 w-3 text-white" />
                              </div>
                            )}
                            <div className="absolute bottom-1 left-1.5 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded">
                              {index + 1}
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* 快捷重新生成按钮 */}
                      {!showCustomPromptInput && (
                        <div className="flex items-center justify-center gap-2 pt-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRegenerateImages('简约清新的投资理财插画，粉色和金色配色，温馨治愈的氛围，扁平化设计风格')}
                            disabled={isRegeneratingImages}
                            className="text-xs border-gray-200 text-gray-600 h-7"
                          >
                            {isRegeneratingImages ? <Loader2 className="h-3 w-3 animate-spin" /> : '🔄 换一批'}
                          </Button>
                        </div>
                      )}
                      
                      {imageUrls.length > 1 && (
                        <p className="text-xs text-gray-400 text-center">已选择第 {selectedImageIndex + 1} 张配图</p>
                      )}
                    </div>
                  )}

                  {/* 合规审查 */}
                  {result?.complianceCheck && (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                        <Shield className={`h-3.5 w-3.5 ${result.complianceCheck.isCompliant ? 'text-green-500' : 'text-amber-500'}`} />
                        合规审查
                        {result.complianceCheck.isCompliant ? (
                          <Badge className="bg-green-100 text-green-700 border-0 ml-1.5 text-xs">通过</Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-700 border-0 ml-1.5 text-xs">需注意</Badge>
                        )}
                      </Label>
                      {result.complianceCheck.warnings.length > 0 && (
                        <div className="space-y-1">
                          {result.complianceCheck.warnings.map((warning, index) => (
                            <div
                              key={index}
                              className="flex items-start gap-2 p-2 bg-amber-50 rounded-lg border border-amber-200 text-amber-800 text-xs"
                            >
                              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                              {warning}
                            </div>
                          ))}
                        </div>
                      )}
                      {result.complianceCheck.suggestions.length > 0 && (
                        <div className="space-y-1">
                          {result.complianceCheck.suggestions.map((suggestion, index) => (
                            <div
                              key={index}
                              className="p-2 bg-blue-50 rounded-lg border border-blue-200 text-blue-800 text-xs"
                            >
                              {suggestion}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 操作按钮 */}
                  {result && (
                    <div className="space-y-2 pt-3 border-t border-gray-100">
                      {/* 复制按钮组 */}
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1 border-rose-200 text-rose-600 hover:bg-rose-50 rounded-lg h-9"
                          onClick={() => handleCopy(result.content)}
                        >
                          <Copy className="h-3.5 w-3.5 mr-1.5" />
                          复制全文
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1 border-rose-200 text-rose-600 hover:bg-rose-50 rounded-lg h-9"
                          onClick={() => handleCopy(`标题：${result.title}\n\n${result.content}\n\n${result.tags.map(t => '#' + t).join(' ')}`)}
                        >
                          <Copy className="h-3.5 w-3.5 mr-1.5" />
                          复制全部
                        </Button>
                      </div>
                      
                      {/* 导出按钮组 */}
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1 border-violet-200 text-violet-600 hover:bg-violet-50 rounded-lg h-9"
                          onClick={() => handleExport('txt')}
                        >
                          <Download className="h-3.5 w-3.5 mr-1.5" />
                          导出TXT
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1 border-violet-200 text-violet-600 hover:bg-violet-50 rounded-lg h-9"
                          onClick={() => handleExport('json')}
                        >
                          <Download className="h-3.5 w-3.5 mr-1.5" />
                          导出JSON
                        </Button>
                        {isVideo && (
                          <Button
                            variant="outline"
                            className="flex-1 border-violet-200 text-violet-600 hover:bg-violet-50 rounded-lg h-9"
                            onClick={() => handleExport('script')}
                          >
                            <Download className="h-3.5 w-3.5 mr-1.5" />
                            导出脚本
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 底部提示 */}
        <div className="text-center mt-6 text-gray-400 text-xs">
          <p className="flex items-center justify-center gap-1.5">
            Made with <Heart className="h-3.5 w-3.5 text-rose-500 fill-rose-500" /> by AI
          </p>
        </div>
      </div>
    </div>
  );
}
