'use client';

import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { 
  Sparkles, RefreshCw, Copy, Download, CheckCircle2, ImageIcon, 
  FileText, Video, TrendingUp, Loader2, Heart, Hash, Shield,
  AlertTriangle, Check, ChevronDown, ChevronUp, Settings2
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  TopicType, UserTag, ContentType, VideoDuration, VideoStyle,
  TitleStyle, HotTopicTimeRange, AdditionalRequirement, PersonaType,
  TitleCandidate, ImageSuggestion, GenerateResult
} from '@/lib/types';
import { 
  TOPIC_TYPE_OPTIONS, USER_TAG_OPTIONS, CONTENT_TYPE_OPTIONS,
  HOT_TOPIC_TIME_RANGE_OPTIONS, TITLE_STYLE_OPTIONS, PERSONA_OPTIONS,
  ADDITIONAL_REQUIREMENT_OPTIONS, VIDEO_DURATION_OPTIONS, VIDEO_STYLE_OPTIONS,
  USER_TAG_TOPIC_COMPATIBILITY
} from '@/lib/constants';

export default function Home() {
  // 基础参数
  const [topicType, setTopicType] = useState<TopicType>('market_hot');
  const [userTag, setUserTag] = useState<UserTag>('beginner');
  const [contentType, setContentType] = useState<ContentType>('article');
  const [hotTopicTimeRange, setHotTopicTimeRange] = useState<HotTopicTimeRange>('7d');
  const [keywords, setKeywords] = useState('');

  // 高级参数
  const [titleStyles, setTitleStyles] = useState<TitleStyle[]>([]);
  const [personaType, setPersonaType] = useState<PersonaType>('hardcore_uncle');
  const [customPersona, setCustomPersona] = useState('');
  const [additionalRequirements, setAdditionalRequirements] = useState<AdditionalRequirement[]>([]);
  
  // 视频专用
  const [videoDuration, setVideoDuration] = useState<VideoDuration>('60s');
  const [videoStyle, setVideoStyle] = useState<VideoStyle>('popular_science');

  // UI状态
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState('');

  // 输出状态
  const [titles, setTitles] = useState<TitleCandidate[]>([]);
  const [selectedTitleIndex, setSelectedTitleIndex] = useState(0);
  const [content, setContent] = useState('');
  const [imageSuggestions, setImageSuggestions] = useState<ImageSuggestion[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [compliance, setCompliance] = useState<{ isCompliant: boolean; warnings: string[] }>({ isCompliant: true, warnings: [] });

  const isVideo = contentType === 'video_script';
  const isCompatible = USER_TAG_TOPIC_COMPATIBILITY[userTag].includes(topicType);

  // 处理用户标签变化
  const handleUserTagChange = (value: UserTag) => {
    setUserTag(value);
    if (!USER_TAG_TOPIC_COMPATIBILITY[value].includes(topicType)) {
      setTopicType(USER_TAG_TOPIC_COMPATIBILITY[value][0]);
    }
  };

  // 切换标题风格多选
  const toggleTitleStyle = (style: TitleStyle) => {
    setTitleStyles(prev => 
      prev.includes(style) 
        ? prev.filter(s => s !== style)
        : [...prev, style]
    );
  };

  // 切换补充要求多选
  const toggleRequirement = (req: AdditionalRequirement) => {
    setAdditionalRequirements(prev =>
      prev.includes(req)
        ? prev.filter(r => r !== req)
        : [...prev, req]
    );
  };

  // 生成内容
  const handleGenerate = useCallback(async () => {
    if (!isCompatible) {
      toast.error('选题类型与用户标签不兼容');
      return;
    }

    setIsGenerating(true);
    setContent('');
    setTitles([]);
    setImageSuggestions([]);
    setTags([]);
    setImageUrls([]);
    setCurrentStep('准备中...');

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicType, userTag, contentType, keywords, hotTopicTimeRange,
          titleStyles, personaType, customPersona, additionalRequirements,
          videoDuration, videoStyle,
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
                    setTitles(data.data);
                    break;
                  case 'content':
                    accumulatedContent += data.data;
                    setContent(accumulatedContent);
                    break;
                  case 'image_suggestions':
                    setImageSuggestions(data.data);
                    break;
                  case 'tags':
                    setTags(data.data);
                    break;
                  case 'images':
                    setImageUrls(data.data);
                    break;
                  case 'compliance':
                    setCompliance(data.data);
                    setCurrentStep('');
                    break;
                }
              } catch (e) {}
            }
          }
        }

        toast.success('生成完成！');
      }
    } catch (error) {
      console.error('生成错误:', error);
      toast.error('生成失败，请重试');
    } finally {
      setIsGenerating(false);
    }
  }, [topicType, userTag, contentType, keywords, hotTopicTimeRange, titleStyles, personaType, customPersona, additionalRequirements, videoDuration, videoStyle, isCompatible]);

  // 复制
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('已复制');
  };

  // 导出
  const handleExport = () => {
    const selectedTitle = titles[selectedTitleIndex]?.title || '';
    const text = `【标题】${selectedTitle}\n\n【正文】\n${content}\n\n【标签】${tags.map(t => '#' + t).join(' ')}\n\n${imageSuggestions.length > 0 ? `【配图建议】\n${imageSuggestions.map(s => `- ${s.type === 'cover' ? '封面图' : '内图'}：${s.description}`).join('\n')}` : ''}`;
    
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `内容_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('已导出');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-orange-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* 头部 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-gradient-to-br from-rose-500 to-pink-500 rounded-xl shadow-lg">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-rose-600 to-orange-500 bg-clip-text text-transparent">
              小红书AI爆款内容生成器
            </h1>
          </div>
          <p className="text-gray-500 text-sm">智能生成专业、深度的财经内容</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* 左侧：输入 */}
          <div className="lg:col-span-2 space-y-4">
            {/* 基础设置 */}
            <Card className="border-0 shadow-lg bg-white/80">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">基础设置</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 选题类型 */}
                <div>
                  <Label className="text-xs text-gray-500 mb-1.5 block">选题类型</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {TOPIC_TYPE_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setTopicType(opt.value)}
                        className={`p-2.5 rounded-lg text-left text-sm transition-all ${
                          topicType === opt.value
                            ? 'bg-rose-500 text-white shadow-md'
                            : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                        }`}
                      >
                        <div className="font-medium">{opt.label}</div>
                        <div className={`text-xs mt-0.5 ${topicType === opt.value ? 'text-rose-100' : 'text-gray-400'}`}>{opt.description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 目标用户 */}
                <div>
                  <Label className="text-xs text-gray-500 mb-1.5 block">目标用户</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {USER_TAG_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => handleUserTagChange(opt.value)}
                        className={`p-2 rounded-lg text-center text-sm transition-all ${
                          userTag === opt.value
                            ? 'bg-pink-500 text-white shadow-md'
                            : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                        }`}
                      >
                        <div className="font-medium text-xs">{opt.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 内容形式 */}
                <div>
                  <Label className="text-xs text-gray-500 mb-1.5 block">内容形式</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {CONTENT_TYPE_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setContentType(opt.value)}
                        className={`p-3 rounded-lg flex items-center gap-2 text-sm transition-all ${
                          contentType === opt.value
                            ? 'bg-orange-500 text-white shadow-md'
                            : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                        }`}
                      >
                        <span className="text-lg">{opt.icon}</span>
                        <span className="font-medium">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 视频专用设置 */}
                {isVideo && (
                  <div className="p-3 bg-orange-50 rounded-lg space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-gray-500 mb-1 block">视频时长</Label>
                        <Select value={videoDuration} onValueChange={(v) => setVideoDuration(v as VideoDuration)}>
                          <SelectTrigger className="h-9 bg-white">
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
                        <Label className="text-xs text-gray-500 mb-1 block">视频风格</Label>
                        <Select value={videoStyle} onValueChange={(v) => setVideoStyle(v as VideoStyle)}>
                          <SelectTrigger className="h-9 bg-white">
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

                {/* 热点时效 & 关键词 */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-gray-500 mb-1 block">热点时效</Label>
                    <Select value={hotTopicTimeRange} onValueChange={(v) => setHotTopicTimeRange(v as HotTopicTimeRange)}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {HOT_TOPIC_TIME_RANGE_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500 mb-1 block">关键词（可选）</Label>
                    <Input
                      placeholder="输入关键词..."
                      value={keywords}
                      onChange={(e) => setKeywords(e.target.value)}
                      className="h-9"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 高级设置 */}
            <Card className="border-0 shadow-lg bg-white/80">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full p-4 flex items-center justify-between"
              >
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Settings2 className="h-4 w-4" />
                  高级设置
                </CardTitle>
                {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              
              {showAdvanced && (
                <CardContent className="pt-0 space-y-4">
                  {/* 标题风格（多选） */}
                  <div>
                    <Label className="text-xs text-gray-500 mb-1.5 block">标题风格（可多选）</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {TITLE_STYLE_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => toggleTitleStyle(opt.value)}
                          className={`px-2.5 py-1 rounded-full text-xs transition-all ${
                            titleStyles.includes(opt.value)
                              ? 'bg-yellow-500 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 博主人设 */}
                  <div>
                    <Label className="text-xs text-gray-500 mb-1.5 block">博主人设</Label>
                    <Select value={personaType} onValueChange={(v) => setPersonaType(v as PersonaType)}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PERSONA_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {personaType === 'custom' && (
                      <Input
                        placeholder="输入自定义人设描述..."
                        value={customPersona}
                        onChange={(e) => setCustomPersona(e.target.value)}
                        className="h-9 mt-2"
                      />
                    )}
                  </div>

                  {/* 补充要求（多选） */}
                  <div>
                    <Label className="text-xs text-gray-500 mb-1.5 block">补充要求（可多选）</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {ADDITIONAL_REQUIREMENT_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => toggleRequirement(opt.value)}
                          className={`px-2.5 py-1 rounded-full text-xs transition-all ${
                            additionalRequirements.includes(opt.value)
                              ? 'bg-violet-500 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* 生成按钮 */}
            <Button
              className="w-full h-12 text-base font-semibold bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 shadow-lg rounded-xl"
              onClick={handleGenerate}
              disabled={isGenerating || !isCompatible}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  {currentStep || '生成中...'}
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5 mr-2" />
                  生成内容
                </>
              )}
            </Button>
          </div>

          {/* 右侧：输出 */}
          <div className="lg:col-span-3">
            <Card className="border-0 shadow-lg bg-white/80 sticky top-4">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-medium">生成结果</CardTitle>
                  {titles.length > 0 && (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={handleExport}>
                        <Download className="h-3.5 w-3.5 mr-1" />
                        导出
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleGenerate}>
                        <RefreshCw className="h-3.5 w-3.5 mr-1" />
                        重新生成
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {titles.length === 0 && !content ? (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                    <FileText className="h-12 w-12 mb-3" />
                    <p>点击"生成内容"开始创作</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* 标题候选 */}
                    {titles.length > 0 && (
                      <div>
                        <Label className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                          <Sparkles className="h-3 w-3 text-rose-500" />
                          标题候选（点击选择）
                        </Label>
                        <div className="space-y-2">
                          {titles.map((t, i) => (
                            <button
                              key={i}
                              onClick={() => setSelectedTitleIndex(i)}
                              className={`w-full p-3 rounded-lg text-left transition-all ${
                                selectedTitleIndex === i
                                  ? 'bg-rose-50 border-2 border-rose-300 shadow-sm'
                                  : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium ${
                                  selectedTitleIndex === i ? 'bg-rose-500 text-white' : 'bg-gray-200 text-gray-500'
                                }`}>
                                  {i + 1}
                                </div>
                                <span className="font-medium text-gray-800">{t.title}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 正文 */}
                    {content && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Label className="text-xs text-gray-500 flex items-center gap-1">
                            {isVideo ? <Video className="h-3 w-3 text-orange-500" /> : <FileText className="h-3 w-3 text-pink-500" />}
                            {isVideo ? '视频脚本' : '正文内容'}
                          </Label>
                          <Button variant="ghost" size="sm" onClick={() => handleCopy(content)}>
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                        <Textarea
                          value={content}
                          readOnly
                          className={`min-h-[200px] resize-none ${isVideo ? 'font-mono text-sm' : ''}`}
                        />
                      </div>
                    )}

                    {/* 配图建议 */}
                    {imageSuggestions.length > 0 && !isVideo && (
                      <div>
                        <Label className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                          <ImageIcon className="h-3 w-3 text-violet-500" />
                          配图建议
                        </Label>
                        <div className="space-y-1.5">
                          {imageSuggestions.map((s, i) => (
                            <div key={i} className="flex items-start gap-2 p-2 bg-violet-50 rounded-lg">
                              <Badge className="bg-violet-100 text-violet-700 border-0 text-xs">
                                {s.type === 'cover' ? '封面' : '内图'}
                              </Badge>
                              <span className="text-sm text-gray-700">{s.description}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* AI配图 */}
                    {imageUrls.length > 0 && (
                      <div>
                        <Label className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                          <ImageIcon className="h-3 w-3 text-blue-500" />
                          AI配图（点击选择）
                        </Label>
                        <div className="grid grid-cols-3 gap-2">
                          {imageUrls.map((url, i) => (
                            <button
                              key={i}
                              onClick={() => setSelectedImageIndex(i)}
                              className={`relative aspect-square rounded-lg overflow-hidden ${
                                selectedImageIndex === i ? 'ring-2 ring-rose-500 ring-offset-2' : ''
                              }`}
                            >
                              <img src={url} alt="" className="w-full h-full object-cover" />
                              {selectedImageIndex === i && (
                                <div className="absolute top-1 right-1 bg-rose-500 rounded-full p-0.5">
                                  <Check className="h-3 w-3 text-white" />
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 标签 */}
                    {tags.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Label className="text-xs text-gray-500 flex items-center gap-1">
                            <Hash className="h-3 w-3 text-orange-500" />
                            话题标签
                          </Label>
                          <Button variant="ghost" size="sm" onClick={() => handleCopy(tags.map(t => '#' + t).join(' '))}>
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {tags.map((tag, i) => (
                            <Badge key={i} className="bg-rose-100 text-rose-700 border-0">#{tag}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 合规审查 */}
                    {compliance && !compliance.isCompliant && (
                      <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                        <div className="flex items-center gap-2 text-amber-700 font-medium mb-2">
                          <AlertTriangle className="h-4 w-4" />
                          合规提醒
                        </div>
                        {compliance.warnings.map((w, i) => (
                          <p key={i} className="text-sm text-amber-600">{w}</p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 底部 */}
        <div className="text-center mt-8 text-gray-400 text-xs">
          Made with <Heart className="h-3 w-3 inline text-rose-500 fill-rose-500" /> by AI
        </div>
      </div>
    </div>
  );
}
