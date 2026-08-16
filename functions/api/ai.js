// functions/api/ai.js
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
      return new Response(JSON.stringify({ error: '未知的 type' }), { status: 400 });
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
            { role: 'system', content: '你是一位有20年经验的资深班主任和教育专家，擅长学生分析、评语撰写、教学建议。' },
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

function buildPrompt(type, payload) {
  switch (type) {
    case 'comment':
      return `请根据以下学生信息生成一份80字以内的个性化期末评语，要求真诚、具体、有鼓励性，避免空话套话。\n\n学生信息：\n${JSON.stringify(payload, null, 2)}`;
    case 'analysis':
      return `请根据以下学生数据，生成一份300字左右的综合分析报告，包含：优势分析、待提升点、可操作建议。\n\n学生数据：\n${JSON.stringify(payload, null, 2)}`;
    case 'class_summary':
      return `请根据以下班级数据，生成一份班级学期总结，包含：整体学业表现、行为规范、考勤情况、活动参与、改进建议。\n\n班级数据：\n${JSON.stringify(payload, null, 2)}`;
    case 'schedule_suggest':
      return `请根据以下课程需求，提供一份合理的课程表排布建议，注意学科搭配、劳逸结合。\n\n课程需求：\n${JSON.stringify(payload, null, 2)}`;
    case 'homework_analyze':
      return `请分析以下作业提交情况，指出问题并给出督促建议。\n\n作业数据：\n${JSON.stringify(payload, null, 2)}`;
    case 'visit_tips':
      return `请根据以下学生情况，提供家访沟通要点和话术建议。\n\n学生情况：\n${JSON.stringify(payload, null, 2)}`;
    case 'notice_polish':
      return `请润色以下通知内容，使其更清晰、得体、专业。\n\n原文：\n${payload}`;
    case 'post_caption':
      return `请为以下班级活动生成一句朋友圈配文。\n\n活动信息：\n${JSON.stringify(payload, null, 2)}`;
    case 'daily_quote':
      return `请生成一句关于教育、成长或励志的名人名言，并注明作者。可以是中文或英文。`;
    default:
      return null;
  }
}