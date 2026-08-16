// functions/api/ai.js

/**
 * WORKBUDDY PRO AI 代理
 * 支持类型：
 *   - comment          : 期末评语生成
 *   - analysis         : 学生综合分析
 *   - class_summary    : 班级学期总结
 *   - schedule_suggest : 排课建议
 *   - homework_analyze : 作业分析
 *   - visit_tips       : 家访话术建议
 *   - notice_polish    : 通知润色
 *   - post_caption     : 朋友圈配文
 *   - daily_quote      : 每日名言
 *   - exam_analysis    : 试卷分析
 *   - anomaly_detection: 成绩异常检测
 */

export async function onRequestPost(context) {
  const { request, env } = context;

  // 处理 CORS 预检
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  try {
    const { type, payload } = await request.json();
    if (!type) {
      return new Response(JSON.stringify({ error: '缺少 type' }), { status: 400 });
    }

    const apiKey = env.BAILIAN_API_KEY;
    const model = env.BAILIAN_MODEL || 'qwen-plus';
    const baseUrl = env.BAILIAN_BASE_URL || 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation';

    if (!apiKey) {
      return new Response(JSON.stringify({ error: '未配置 BAILIAN_API_KEY' }), { status: 500 });
    }

    const prompt = buildPrompt(type, payload);
    if (!prompt) {
      return new Response(JSON.stringify({ error: `未知的 type: ${type}` }), { status: 400 });
    }

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        input: {
          messages: [
            { role: 'system', content: getSystemPrompt() },
            { role: 'user', content: prompt }
          ]
        },
        parameters: {
          max_tokens: 1500,
          temperature: 0.7
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(JSON.stringify({ error: errorText }), {
        status: response.status,
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    }

    const result = await response.json();
    // 兼容百炼不同返回格式
    const content = result.output?.text || result.output?.choices?.[0]?.message?.content || '';

    return new Response(JSON.stringify({ content }), {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  }
}

// ========== 系统提示 ==========
function getSystemPrompt() {
  return `你是一位有20年经验的资深班主任和教育专家，擅长学生分析、评语撰写、教学建议。你的回答应当真诚、具体、有建设性，避免空话套话。`;
}

// ========== Prompt 构建器 ==========
function buildPrompt(type, payload) {
  switch (type) {
    case 'comment':
      return `请根据以下学生信息生成一份80字以内的个性化期末评语，要求真诚、具体、有鼓励性，避免空话套话。
风格：${payload.style || '鼓励型'}（鼓励型：多肯定优点；建议型：指出不足并给出建议；幽默型：轻松有趣）

学生信息：
姓名：${payload.name}
性别：${payload.gender || '未知'}
职务：${payload.role || '无'}
${payload.ethnicity ? `族别：${payload.ethnicity}` : ''}
${payload.notes ? `备注：${payload.notes}` : ''}

请直接输出评语内容，不需要额外说明。`;

    case 'analysis':
      return `请根据以下学生数据，生成一份300字左右的综合分析报告，包含：优势分析、待提升点、可操作建议。
学生信息：${JSON.stringify(payload, null, 2)}`;

    case 'class_summary':
      return `请根据以下班级数据，生成一份班级学期总结，包含：整体学业表现、行为规范、考勤情况、活动参与、改进建议。
班级数据：${JSON.stringify(payload, null, 2)}`;

    case 'schedule_suggest':
      if (payload.format === 'json') {
        return `请根据以下课程需求，提供一份合理的课程表排布建议，要求以JSON数组格式返回，每个元素包含 subject, teacher, day, period, week（可选）。注意学科搭配、劳逸结合。
课程需求：${JSON.stringify(payload, null, 2)}
直接返回JSON数组，不要包含额外文字。`;
      }
      return `请根据以下课程需求，提供一份合理的课程表排布建议，注意学科搭配、劳逸结合。
课程需求：${JSON.stringify(payload, null, 2)}`;

    case 'homework_analyze':
      return `请分析以下作业提交情况，指出问题并给出督促建议。
作业数据：${JSON.stringify(payload, null, 2)}`;

    case 'visit_tips':
      return `请根据以下学生情况，提供家访沟通要点和话术建议，要求有具体问题、话术模板和注意事项。
学生情况：${JSON.stringify(payload, null, 2)}`;

    case 'notice_polish':
      return `请润色以下通知内容，使其更清晰、得体、专业。原文：\n${payload}`;

    case 'post_caption':
      return `请为以下班级活动生成一句朋友圈配文，简洁有趣，包含适当的表情符号。
活动信息：${JSON.stringify(payload, null, 2)}`;

    case 'daily_quote':
      return `请生成一句关于教育、成长或励志的名人名言，并注明作者。可以是中文或英文。直接输出名言内容。`;

    case 'exam_analysis':
      return `请分析以下试卷内容，提取题型分布、各题型分值占比、难度评估，并针对班级常见薄弱点给出教学建议。
试卷内容：\n${payload.content}`;

    case 'anomaly_detection':
      return `请根据以下学生成绩异常数据，分析可能的原因（如学习态度、难度变化、家庭因素等），并给出具体的干预建议。
学生信息：${JSON.stringify(payload.student, null, 2)}
异常科目详情：${JSON.stringify(payload.anomalies, null, 2)}`;

    default:
      return null;
  }
}