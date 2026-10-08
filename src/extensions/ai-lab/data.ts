/**
 * Mock data shaped like AI Lab's `ai.json` (recipes, models, categories), the
 * Hugging Face `RedHatAI` org (Oct 2026), Red Hat AI validated ModelCars and the
 * OpenShift AI model catalog of `rhoai-dev`. Ids are real where they exist.
 */
import type { CatalogModel, Recipe } from './shared.ts';

const GB = 1_000_000_000;

export const CATEGORIES: Record<string, string> = {
  'natural-language-processing': 'Natural Language Processing',
  'computer-vision': 'Computer Vision',
  audio: 'Audio',
  multimodal: 'Multimodal',
};

export const RECIPES: Recipe[] = [
  {
    id: 'chatbot',
    name: 'ChatBot',
    description: 'This recipe provides a blueprint for developers to create their own AI-powered chat applications using Streamlit.',
    categories: ['natural-language-processing'],
    languages: ['python'],
    frameworks: ['streamlit', 'langchain'],
    backend: 'llama-cpp',
    recommended: ['hf.ibm-granite.granite-3.3-8b-instruct-GGUF', 'hf.ibm-granite.granite-4.0-micro-GGUF'],
  },
  {
    id: 'chatbot-pydantic-ai',
    name: 'Chatbot PydanticAI',
    description: 'This recipe provides a blueprint for developers to create their own AI-powered chat applications with the pydantic framework using Streamlit.',
    categories: ['natural-language-processing'],
    languages: ['python'],
    frameworks: ['streamlit', 'pydantic-ai'],
    backend: 'llama-cpp',
    recommended: ['hf.ibm-granite.granite-3.3-8b-instruct-GGUF'],
  },
  {
    id: 'summarizer',
    name: 'Summarizer',
    description: 'This recipe guides into creating custom LLM-powered summarization applications using Streamlit.',
    categories: ['natural-language-processing'],
    languages: ['python'],
    frameworks: ['streamlit', 'langchain'],
    backend: 'llama-cpp',
    recommended: ['hf.ibm-granite.granite-4.0-tiny-GGUF'],
  },
  {
    id: 'codegeneration',
    name: 'Code Generation',
    description: 'This recipes showcases how to leverage LLM to build your own custom code generation application.',
    categories: ['natural-language-processing'],
    languages: ['python'],
    frameworks: ['streamlit', 'langchain'],
    backend: 'llama-cpp',
    recommended: ['hf.ibm-granite.granite-8b-code-instruct'],
  },
  {
    id: 'rag',
    name: 'RAG Chatbot',
    description: 'This application illustrates how to integrate RAG (Retrieval Augmented Generation) into LLM applications enabling to interact with your own documents.',
    categories: ['natural-language-processing'],
    languages: ['python'],
    frameworks: ['streamlit', 'langchain', 'vectordb'],
    backend: 'llama-cpp',
    recommended: ['hf.ibm-granite.granite-3.3-8b-instruct-GGUF'],
  },
  {
    id: 'rag-nodejs',
    name: 'RAG Node.js Chatbot',
    description: 'A Node.js RAG chat application using LangChain.js, ChromaDB and a local model service.',
    categories: ['natural-language-processing'],
    languages: ['javascript'],
    frameworks: ['react', 'langchain', 'vectordb'],
    backend: 'llama-cpp',
    recommended: ['hf.ibm-granite.granite-3.3-8b-instruct-GGUF'],
  },
  {
    id: 'chatbot-java-quarkus',
    name: 'Java-based ChatBot (Quarkus)',
    description: 'This is a Java Quarkus-based recipe demonstrating how to create an AI-powered chat applications.',
    categories: ['natural-language-processing'],
    languages: ['java'],
    frameworks: ['quarkus', 'langchain4j'],
    backend: 'llama-cpp',
    recommended: ['hf.ibm-granite.granite-4.0-tiny-GGUF'],
  },
  {
    id: 'function-calling',
    name: 'Function calling',
    description: 'This recipes guides into multiple function calling use cases, showing the ability to structure data and chain multiple tasks, using Streamlit.',
    categories: ['natural-language-processing'],
    languages: ['python'],
    frameworks: ['streamlit', 'langchain'],
    backend: 'llama-cpp',
    recommended: ['hf.ibm-granite.granite-3.3-8b-instruct-GGUF'],
  },
  {
    id: 'agents',
    name: 'ReAct Agent Application',
    description: 'This recipe demonstrates the ReAct (Reasoning and Acting) framework in action through a music exploration application.',
    categories: ['natural-language-processing'],
    languages: ['python'],
    frameworks: ['streamlit', 'langgraph'],
    backend: 'llama-cpp',
    recommended: ['hf.ibm-granite.granite-3.3-8b-instruct-GGUF'],
  },
  {
    id: 'chatbot-llama-stack',
    name: 'Chatbot using Llama Stack',
    description: 'A chatbot built on the Llama Stack API, served by the AI Lab Llama Stack container.',
    categories: ['natural-language-processing'],
    languages: ['python'],
    frameworks: ['streamlit', 'llama-stack'],
    backend: 'none',
    recommended: [],
  },
  {
    id: 'audio_to_text',
    name: 'Audio to Text',
    description: 'This application demonstrate how to use LLM for transcripting an audio into text.',
    categories: ['audio'],
    languages: ['python'],
    frameworks: ['streamlit'],
    backend: 'whisper-cpp',
    recommended: ['hf.ggerganov.whisper.cpp'],
  },
  {
    id: 'object_detection',
    name: 'Object Detection',
    description: 'This recipe illustrates how to use LLM to interact with images and build object detection applications.',
    categories: ['computer-vision'],
    languages: ['python'],
    frameworks: ['streamlit'],
    backend: 'none',
    recommended: ['hf.facebook.detr-resnet-101'],
  },
];

/** AI Lab `ai.json` models (GGUF, llama.cpp / whisper.cpp / OpenVINO). */
const AI_LAB_MODELS: CatalogModel[] = [
  { id: 'hf.ibm-granite.granite-3.3-8b-instruct-GGUF', name: 'ibm-granite/granite-3.3-8b-instruct-GGUF', source: 'ai-lab', registry: 'Hugging Face', license: 'Apache-2.0', backend: 'llama-cpp', size: 4939212390, quantization: 'Q4_K_M', task: 'text-generation', estVramGB: 6.2, file: 'granite-3.3-8b-instruct-Q4_K_M.gguf' },
  { id: 'hf.ibm-granite.granite-4.0-micro-GGUF', name: 'ibm-granite/granite-4.0-micro-GGUF', source: 'ai-lab', registry: 'Hugging Face', license: 'Apache-2.0', backend: 'llama-cpp', size: 2100000000, quantization: 'Q4_K_M', task: 'text-generation', estVramGB: 2.8, file: 'granite-4.0-micro-Q4_K_M.gguf' },
  { id: 'hf.ibm-granite.granite-4.0-tiny-GGUF', name: 'ibm-granite/granite-4.0-tiny-GGUF', source: 'ai-lab', registry: 'Hugging Face', license: 'Apache-2.0', backend: 'llama-cpp', size: 4224733676, quantization: 'Q4_K_M', task: 'text-generation', estVramGB: 5.3 },
  { id: 'hf.ibm-granite.granite-8b-code-instruct', name: 'ibm-granite/granite-8b-code-instruct-4k-GGUF', source: 'ai-lab', registry: 'Hugging Face', license: 'Apache-2.0', backend: 'llama-cpp', size: 4880000000, quantization: 'Q4_K_M', task: 'text-generation', estVramGB: 6 },
  { id: 'hf.openai.gpt-oss-20b', name: 'openai/gpt-oss-20b', source: 'ai-lab', registry: 'Hugging Face', license: 'Apache-2.0', backend: 'llama-cpp', size: 11600000000, quantization: 'MXFP4', task: 'text-generation', estVramGB: 13 },
  { id: 'hf.mistralai.mistral-small-3.2-24b-instruct-2506', name: 'mistralai/Mistral-Small-3.2-24B-Instruct-2506', source: 'ai-lab', registry: 'Hugging Face', license: 'Apache-2.0', backend: 'llama-cpp', size: 14300000000, quantization: 'Q4_K_M', task: 'text-generation', estVramGB: 16 },
  { id: 'hf.qwen.qwen3-4b-GGUF', name: 'Qwen/Qwen3-4B-GGUF', source: 'ai-lab', registry: 'Hugging Face', license: 'Apache-2.0', backend: 'llama-cpp', size: 2500000000, quantization: 'Q4_K_M', task: 'text-generation', estVramGB: 3.4 },
  { id: 'hf.microsoft.Phi-4-mini-reasoning', name: 'microsoft/Phi-4-mini-reasoning', source: 'ai-lab', registry: 'Hugging Face', license: 'MIT', backend: 'llama-cpp', size: 2490000000, quantization: 'Q4_K_M', task: 'text-generation', estVramGB: 3.3 },
  { id: 'OpenVINO/mistral-7B-instruct-v0.2-int4-ov', name: 'OpenVINO/mistral-7B-instruct-v0.2-int4-ov', source: 'ai-lab', registry: 'Hugging Face', license: 'Apache-2.0', backend: 'openvino', size: 4100000000, quantization: 'INT4', task: 'text-generation', estVramGB: 5 },
  { id: 'hf.ggerganov.whisper.cpp', name: 'ggerganov/whisper.cpp', source: 'ai-lab', registry: 'Hugging Face', license: 'MIT', backend: 'whisper-cpp', size: 487010000, task: 'automatic-speech-recognition', estVramGB: 1 },
  { id: 'hf.facebook.detr-resnet-101', name: 'facebook/detr-resnet-101', source: 'ai-lab', registry: 'Hugging Face', license: 'Apache-2.0', backend: 'none', size: 242000000, task: 'object-detection', estVramGB: 1 },
];

/** Hugging Face RedHatAI org, live data Oct 2026 (safetensors, compressed-tensors, vLLM). */
const REDHATAI_MODELS: CatalogModel[] = [
  { id: 'RedHatAI/granite-3.1-8b-instruct-quantized.w4a16', name: 'RedHatAI/granite-3.1-8b-instruct-quantized.w4a16', source: 'redhatai', registry: 'Hugging Face', license: 'Apache-2.0', backend: 'vllm', size: 5.4 * GB, quantization: 'w4a16', task: 'text-generation', estVramGB: 5.4, downloads: 1372, validated: true, modelcar: 'oci://registry.redhat.io/rhelai1/modelcar-granite-3-1-8b-instruct-quantized-w4a16:1.5', baseModel: 'ibm-granite/granite-3.1-8b-instruct' },
  { id: 'RedHatAI/granite-3.1-8b-instruct-quantized.w8a8', name: 'RedHatAI/granite-3.1-8b-instruct-quantized.w8a8', source: 'redhatai', registry: 'Hugging Face', license: 'Apache-2.0', backend: 'vllm', size: 9.1 * GB, quantization: 'w8a8', task: 'text-generation', estVramGB: 9.1, downloads: 307, validated: true, modelcar: 'oci://registry.redhat.io/rhelai1/modelcar-granite-3-1-8b-instruct-quantized-w8a8:1.5' },
  { id: 'RedHatAI/granite-4.0-h-tiny-FP8-dynamic', name: 'RedHatAI/granite-4.0-h-tiny-FP8-dynamic', source: 'redhatai', registry: 'Hugging Face', license: 'Apache-2.0', backend: 'vllm', size: 7.2 * GB, quantization: 'FP8-dynamic', task: 'text-generation', estVramGB: 7.2, downloads: 648 },
  { id: 'RedHatAI/Qwen3.8-27B-INT4', name: 'RedHatAI/Qwen3.8-27B-INT4', source: 'redhatai', registry: 'Hugging Face', license: 'Apache-2.0', backend: 'vllm', size: 16 * GB, quantization: 'INT4', task: 'image-text-to-text', estVramGB: 16, downloads: 574213 },
  { id: 'RedHatAI/gemma-4-26B-A4B-it-FP8-dynamic', name: 'RedHatAI/gemma-4-26B-A4B-it-FP8-dynamic', source: 'redhatai', registry: 'Hugging Face', license: 'Gemma', backend: 'vllm', size: 27 * GB, quantization: 'FP8-dynamic', task: 'image-text-to-text', estVramGB: 28, downloads: 212480 },
  { id: 'RedHatAI/Llama-3.2-3B-Instruct-FP8-dynamic', name: 'RedHatAI/Llama-3.2-3B-Instruct-FP8-dynamic', source: 'redhatai', registry: 'Hugging Face', license: 'Llama 3.2', backend: 'vllm', size: 3.6 * GB, quantization: 'FP8-dynamic', task: 'text-generation', estVramGB: 4.2, downloads: 98314 },
  { id: 'RedHatAI/Llama-3.3-70B-Instruct-quantized.w4a16', name: 'RedHatAI/Llama-3.3-70B-Instruct-quantized.w4a16', source: 'redhatai', registry: 'Hugging Face', license: 'Llama 3.3', backend: 'vllm', size: 40 * GB, quantization: 'w4a16', task: 'text-generation', estVramGB: 40, downloads: 7082 },
  { id: 'RedHatAI/Llama-3.3-70B-Instruct-FP8-dynamic', name: 'RedHatAI/Llama-3.3-70B-Instruct-FP8-dynamic', source: 'redhatai', registry: 'Hugging Face', license: 'Llama 3.3', backend: 'vllm', size: 72 * GB, quantization: 'FP8-dynamic', task: 'text-generation', estVramGB: 72, downloads: 120316 },
  { id: 'RedHatAI/Qwen3-Coder-Next-FP8-dynamic', name: 'RedHatAI/Qwen3-Coder-Next-FP8-dynamic', source: 'redhatai', registry: 'Hugging Face', license: 'Apache-2.0', backend: 'vllm', size: 48 * GB, quantization: 'FP8-dynamic', task: 'text-generation', estVramGB: 48.2, downloads: 64102 },
  { id: 'RedHatAI/Qwen3.6-35B-A3B-NVFP4', name: 'RedHatAI/Qwen3.6-35B-A3B-NVFP4', source: 'redhatai', registry: 'Hugging Face', license: 'Apache-2.0', backend: 'vllm', size: 21 * GB, quantization: 'NVFP4', task: 'image-text-to-text', estVramGB: 21, downloads: 1071756, blackwellOnly: true },
  { id: 'RedHatAI/gpt-oss-20b', name: 'RedHatAI/gpt-oss-20b', source: 'redhatai', registry: 'Hugging Face', license: 'Apache-2.0', backend: 'vllm', size: 13.8 * GB, quantization: 'MXFP4', task: 'text-generation', estVramGB: 16, downloads: 3449, validated: true, modelcar: 'oci://registry.redhat.io/rhelai1/modelcar-gpt-oss-20b:1.5' },
  { id: 'RedHatAI/whisper-large-v3-FP8-dynamic', name: 'RedHatAI/whisper-large-v3-FP8-dynamic', source: 'redhatai', registry: 'Hugging Face', license: 'Apache-2.0', backend: 'vllm', size: 1.7 * GB, quantization: 'FP8-dynamic', task: 'automatic-speech-recognition', estVramGB: 2.4, downloads: 86688 },
];

/** Red Hat AI validated ModelCar images (registry.redhat.io, pull secret from the Red Hat account). */
const VALIDATED_MODELS: CatalogModel[] = [
  { id: 'registry.redhat.io/rhelai1/modelcar-granite-3-1-8b-instruct:1.5', name: 'modelcar-granite-3-1-8b-instruct:1.5', source: 'validated', registry: 'registry.redhat.io', license: 'Apache-2.0', backend: 'vllm', size: 16.4 * GB, task: 'text-generation', estVramGB: 19, validated: true, modelcar: 'oci://registry.redhat.io/rhelai1/modelcar-granite-3-1-8b-instruct:1.5' },
  { id: 'registry.redhat.io/rhelai1/modelcar-granite-3-1-8b-instruct-quantized-w8a8:1.5', name: 'modelcar-granite-3-1-8b-instruct-quantized-w8a8:1.5', source: 'validated', registry: 'registry.redhat.io', license: 'Apache-2.0', backend: 'vllm', size: 9.1 * GB, quantization: 'w8a8', task: 'text-generation', estVramGB: 10, validated: true, modelcar: 'oci://registry.redhat.io/rhelai1/modelcar-granite-3-1-8b-instruct-quantized-w8a8:1.5' },
  { id: 'registry.redhat.io/rhelai1/modelcar-llama-3-3-70b-instruct:1.5', name: 'modelcar-llama-3-3-70b-instruct:1.5', source: 'validated', registry: 'registry.redhat.io', license: 'Llama 3.3', backend: 'vllm', size: 141 * GB, task: 'text-generation', estVramGB: 160, validated: true, modelcar: 'oci://registry.redhat.io/rhelai1/modelcar-llama-3-3-70b-instruct:1.5' },
  { id: 'registry.redhat.io/rhelai1/modelcar-gpt-oss-20b:1.5', name: 'modelcar-gpt-oss-20b:1.5', source: 'validated', registry: 'registry.redhat.io', license: 'Apache-2.0', backend: 'vllm', size: 13.8 * GB, quantization: 'MXFP4', task: 'text-generation', estVramGB: 16, validated: true, modelcar: 'oci://registry.redhat.io/rhelai1/modelcar-gpt-oss-20b:1.5' },
  { id: 'registry.redhat.io/rhai/modelcar-granite-embedding-english-r2', name: 'modelcar-granite-embedding-english-r2', source: 'validated', registry: 'registry.redhat.io', license: 'Apache-2.0', backend: 'vllm', size: 0.6 * GB, task: 'embedding', estVramGB: 1.2, validated: true, modelcar: 'oci://registry.redhat.io/rhai/modelcar-granite-embedding-english-r2' },
];

/** OpenShift AI model catalog of rhoai-dev ("Red Hat AI validated models" source). */
const RHOAI_MODELS: CatalogModel[] = [
  { id: 'rhoai-dev/granite-3.1-8b-instruct', name: 'granite-3.1-8b-instruct', source: 'rhoai', registry: 'rhoai-dev · Red Hat AI validated models', license: 'Apache-2.0', backend: 'vllm', task: 'text-generation', estVramGB: 19, validated: true, provider: 'IBM', maturity: 'Generally Available', modelcar: 'oci://registry.redhat.io/rhelai1/modelcar-granite-3-1-8b-instruct:1.5' },
  { id: 'rhoai-dev/granite-3.3-8b-instruct', name: 'granite-3.3-8b-instruct', source: 'rhoai', registry: 'rhoai-dev · Red Hat AI models', license: 'Apache-2.0', backend: 'vllm', task: 'text-generation', estVramGB: 19, provider: 'IBM', maturity: 'Generally Available', modelcar: 'oci://quay.io/redhat-ai-services/modelcar-catalog:granite-3.3-8b-instruct' },
  { id: 'rhoai-dev/qwen3-8b', name: 'qwen3-8b', source: 'rhoai', registry: 'rhoai-dev · Red Hat AI models', license: 'Apache-2.0', backend: 'vllm', task: 'text-generation', estVramGB: 18, provider: 'Alibaba Cloud', maturity: 'Technology Preview', modelcar: 'oci://quay.io/redhat-ai-services/modelcar-catalog:qwen3-8b' },
  { id: 'rhoai-dev/acme-support-granite', name: 'acme-support-granite (v3)', source: 'rhoai', registry: 'rhoai-dev · Model registry', license: 'Apache-2.0', backend: 'vllm', task: 'text-generation', estVramGB: 5.4, provider: 'Acme (sam)', maturity: 'LIVE', modelcar: 'oci://quay.io/sam/modelcar-granite-3.1-8b-instruct-w4a16:1.0' },
];

export const CATALOG: CatalogModel[] = [...AI_LAB_MODELS, ...REDHATAI_MODELS, ...VALIDATED_MODELS, ...RHOAI_MODELS];

export const SOURCES: { id: CatalogModel['source'] | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'ai-lab', label: 'AI Lab' },
  { id: 'redhatai', label: 'RedHatAI (Hugging Face)' },
  { id: 'validated', label: 'Red Hat validated' },
  { id: 'rhoai', label: 'rhoai-dev catalog' },
];

/** Inference images (AI Lab `inference-images.json` + proposed RHAII vLLM). */
export const INFERENCE_IMAGES: Record<string, { cpu: string; cuda?: string; label: string }> = {
  'llama-cpp': {
    label: 'llama.cpp',
    cpu: 'quay.io/ramalama/ramalama-llama-server@sha256:293f4c1a',
    cuda: 'quay.io/ramalama/cuda-llama-server@sha256:b9ced640',
  },
  openvino: { label: 'OpenVINO', cpu: 'quay.io/ramalama/openvino@sha256:e026a1b7' },
  'whisper-cpp': { label: 'whisper.cpp', cpu: 'quay.io/ramalama/ramalama-whisper-server@sha256:2ce4b1f0' },
  vllm: {
    label: 'Red Hat AI Inference (vLLM)',
    cpu: 'registry.redhat.io/rhaii/vllm-cpu-rhel9:3.4.1',
    cuda: 'registry.redhat.io/rhaii/vllm-cuda-rhel9:3.4.1',
  },
};

/** Canned assistant answers for the playground (streamed word by word). */
export const CANNED: { match: RegExp; answer: string }[] = [
  {
    match: /password|reset|account/i,
    answer:
      'To reset your Acme account password, open **Settings › Security** in the Acme app and choose *Reset password*. You will receive a one-time link by e-mail that is valid for 30 minutes. If you no longer have access to that mailbox, contact Acme support with your order number so we can verify your identity.',
  },
  {
    match: /return|refund/i,
    answer:
      'Acme accepts returns within 30 days of delivery. Start the return from **Orders › Return an item**, print the prepaid label, and drop the parcel at any partner location. Refunds are issued to the original payment method within 5 business days after the warehouse scans the package.',
  },
  {
    match: /warranty|manual|install/i,
    answer:
      'According to the *Acme SmartHub 3 installation manual* (section 4.2), mount the hub at least 1.5 m above the floor, connect the PoE cable first, then hold the pairing button for 5 seconds until the LED blinks blue. The device is covered by a 2-year limited warranty.',
  },
];

export const DEFAULT_ANSWER =
  'Happy to help! Based on the Acme product manuals I have access to, here is a short answer: the SmartHub 3 supports Wi-Fi 6 and Thread, firmware updates are installed automatically at night, and you can check the current version under **Device › About**. Let me know if you need step-by-step instructions.';

export const SYSTEM_PROMPT = 'You are the Acme support assistant. Answer using the Acme product manuals; be concise and cite the manual section when possible.';
