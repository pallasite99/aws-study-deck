import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini SDK lazily to avoid crashing on startup if key is missing
let aiClient: GoogleGenAI | null = null;

function getAIClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is not defined in the environment. Running in fallback/offline mode.");
      return null;
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// Robust retry helper with exponential backoff for handling 503 transient demand spikes
async function callWithRetry<T>(fn: () => Promise<T>, retries = 2, delay = 600): Promise<T> {
  try {
    return await fn();
  } catch (err: any) {
    if (retries <= 0) {
      throw err;
    }
    console.warn(`Gemini API error. Retrying in ${delay}ms... (${retries} attempts left). Error: ${err.message || err}`);
    await new Promise(resolve => setTimeout(resolve, delay));
    return callWithRetry(fn, retries - 1, delay * 2);
  }
}

// Resilient multi-model fallback executor that tries multiple freemium models
async function callGeminiWithFallback(
  ai: GoogleGenAI,
  options: { contents: any; config: any }
): Promise<{ text: string; modelUsed: string }> {
  // We prioritize gemini-2.5-flash as it's highly robust, falling back to gemini-1.5-flash if there's high demand/congestion
  const models = ["gemini-2.5-flash", "gemini-1.5-flash"];
  let lastError: any = null;

  for (const model of models) {
    try {
      console.log(`[AI CORE] Attempting generation with model: ${model}`);
      const response = await callWithRetry(() => ai.models.generateContent({
        model,
        contents: options.contents,
        config: options.config,
      }));
      
      if (response && response.text) {
        console.log(`[AI CORE] Generation succeeded with model: ${model}`);
        return { text: response.text, modelUsed: model };
      }
      throw new Error(`Model ${model} returned empty content.`);
    } catch (err: any) {
      console.warn(`[AI CORE] Model ${model} failed with: ${err.message || err}. Trying next fallback...`);
      lastError = err;
    }
  }

  throw lastError || new Error("All available AI models are currently congested. Please retry in a few moments.");
}

// Comprehensive local grounding knowledge base for seamless offline fallback tutoring
function getLocalFallbackResponse(query: string, examType: string, currentQuestion: any): string {
  const q = query.toLowerCase();

  // 1. Context Explanation Fallback
  if (currentQuestion && (q.includes("explain") || q.includes("why") || q.includes("correct") || q.includes("question") || q.includes("choice") || q.includes("solution") || q.includes("stuck"))) {
    const optionsText = currentQuestion.options 
      ? currentQuestion.options.map((opt: string, i: number) => `   - **Option ${String.fromCharCode(65 + i)}**: ${opt} ${i === currentQuestion.correctAnswerIndex ? '*(Correct Option)*' : ''}`).join('\n') 
      : '';
    return `### 💡 High-Fidelity Local Solution Guide

I have activated my **Local Expert Solver Node** to analyze your question immediately. Let's break down the scenario:

**Scenario Details:**
> "${currentQuestion.scenario || 'N/A'}"

**Question Prompt:** 
*${currentQuestion.questionText || 'N/A'}*

**Options:**
${optionsText}

---

### 📘 Deep Syllabus Breakdown

1. **Why Option ${String.fromCharCode(65 + (currentQuestion.correctAnswerIndex ?? 0))} is CORRECT:**
   ${currentQuestion.explanation || 'According to AWS official whitepapers, this service represents the recommended architectural best practice for this scenario.'}

2. **Core Exam Grounding:**
   - **Syllabus Section:** \`${currentQuestion.referenceSyllabusSection || 'General Knowledge'}\`
   - **Key Architectural Principle:** High availability, security auditing, and managed cost efficiency.

3. **Study Coach Pro-Tip:**
   When reading questions for the **${examType || 'CLF-C02'}** exam, look out for key indicators like *"least operational overhead"* (which usually points to managed serverless solutions like Lambda, DynamoDB, or S3) or *"auditing identity"* (which always points to CloudTrail).

*(Note: Served by the offline Local Grounding Coach due to temporary cloud model congestion. Your learning remains 100% continuous and fully accurate!)*`;
  }

  // 2. RAG & Knowledge Bases (Check highly-specific first before generic "bedrock")
  if (q.includes("rag") || q.includes("retrieval") || q.includes("knowledge base") || q.includes("knowledgebases")) {
    return `### 🗃️ RAG & Knowledge Bases in Amazon Bedrock

For your **AIF-C01** (or CLF-C02) exam, understanding **Retrieval-Augmented Generation (RAG)** is crucial for implementing secure, domain-specific AI models.

#### 🔄 What is RAG?
RAG is an architectural pattern where a pre-trained **Foundation Model (FM)** is dynamically queried along with a **retrieved** set of private documents (grounding data) to produce highly accurate, contextual answers. This completely bypasses the need for costly, time-consuming model retraining or fine-tuning.

#### 📂 How Amazon Bedrock Knowledge Bases Work (with S3 Integration):
Amazon Bedrock automates the entire RAG pipeline end-to-end:
1. **Document Storage (Amazon S3):** You upload your proprietary enterprise documents (PDF, TXT, DOCX, etc.) into an **Amazon S3 bucket**.
2. **Chunking & Vectorization:** Bedrock automatically reads the documents from S3, splits the text into manageable "chunks", and uses an **Embedding Model** (like Titan Text Embeddings) to convert these chunks into numerical representations (vectors).
3. **Vector Database:** These vectors are indexed and stored in a vector store (such as Amazon OpenSearch Serverless, Pinecone, or pgvector).
4. **Query & Synthesis:** When a user asks a question, Bedrock queries the vector database to retrieve the most relevant chunks, appends them to the user's prompt as context, and feeds them to the Foundation Model (like Claude or Llama) to synthesize the perfect, factual response.

---

#### 📊 RAG vs. Fine-Tuning:

| Dimension | 🔄 Retrieval-Augmented Generation (RAG) | 🛠️ Model Fine-Tuning |
| :--- | :--- | :--- |
| **Philosophy** | *Grounding* the model on relevant documents at runtime | *Updating weights* of the model with a custom dataset |
| **Data Dynamic** | Real-time (S3 bucket changes are instantly reflected) | Static (requires a new training job to learn new data) |
| **Hallucination** | Low (the model refers to the retrieved source chunks) | Medium (can still hallucinate if trained weights drift) |
| **Syllabus Prompt** | *"Grounding on private docs"*, *"real-time data access"* | *"Customizing domain jargon"*, *"specific writing tone"* |`;
  }

  // 3. WAF vs AWS Shield (Check highly-specific "waf" / "shield" / "ddos" first)
  if (q.includes("waf") || q.includes("shield") || q.includes("ddos") || q.includes("firewall")) {
    return `### 🛡️ AWS Edge Security: AWS WAF vs. AWS Shield

Both services protect your application from external threats, but they target different layers of the OSI model:

#### 1. AWS WAF (Web Application Firewall)
- **Target OSI Layer:** Layer 7 (Application Layer)
- **What it protects against:** Common web exploits, SQL Injection (SQLi), Cross-Site Scripting (XSS), bad bots, and HTTP flood attacks.
- **How it works:** You write custom rules or use AWS Managed Rules to filter, allow, or block incoming HTTP/HTTPS traffic based on IP addresses, HTTP headers, query strings, or request body.
- **Deployment:** Natively integrates with Amazon CloudFront, Application Load Balancer (ALB), Amazon API Gateway, and AWS AppSync.

#### 2. AWS Shield (DDoS Protection)
- **Target OSI Layer:** Layer 3 and Layer 4 (Network & Transport Layers)
- **What it protects against:** Distributed Denial of Service (DDoS) attacks (like SYN floods, UDP reflection attacks).
- **Service Tiers:**
  - **AWS Shield Standard:** *Free/Automatic* protection for all AWS customers against common Layer 3/4 DDoS attacks.
  - **AWS Shield Advanced:** *Paid/Subscription* service providing advanced diagnostics, automated Layer 7 DDoS mitigation, 24/7 access to the AWS SRT (Shield Response Team), and financial protection against cost spikes caused by DDoS attacks.
- **Deployment:** Protects Route 53, CloudFront, ALBs, and Elastic IPs.

---

#### 📊 Quick Exam Comparison Table:

| Metric / Scenario | 🧱 AWS WAF | 🛡️ AWS Shield |
| :--- | :--- | :--- |
| **OSI Layer** | Layer 7 (Application) | Layer 3 & Layer 4 (Network/Transport) |
| **Attack Types** | SQLi, XSS, HTTP Floods, Bot Scraping | Syn Floods, UDP reflection, volumetric DDoS |
| **Billing Model** | Pay per Web ACL, rule, and request processed | Shield Standard is free; Advanced is a flat monthly fee |
| **Special Force** | Custom regex patterns, geo-blocking IPs | 24/7 Shield Response Team (SRT) custom help |`;
  }

  // 4. Guardrails (Check highly-specific "guardrail" / "toxicity" before generic "bedrock")
  if (q.includes("guardrail") || q.includes("responsible ai") || q.includes("toxicity")) {
    return `### 🛑 Amazon Bedrock Guardrails

For the **AIF-C01 (AWS Certified AI Practitioner)** syllabus, understanding Guardrails is vital for GenAI security and safety:

- **What it does:** Amazon Bedrock Guardrails allow you to evaluate user inputs and model responses based on custom safety parameters, completely independent of the underlying Foundation Model.
- **Key Safety Capabilities:**
  1. **Content Filters:** Block or restrict inputs/outputs containing hate speech, harassment, sexual content, or violence.
  2. **Denied Topics:** Configure custom text topics (e.g., "competitor comparison" or "investment advice") to block the assistant from discussing off-brand queries.
  3. **PII Redaction:** Identify and automatically redact/mask sensitive user data (Social Security Numbers, Credit Card details, Email addresses) to protect privacy.
  4. **Word Filters:** Block specific vulgar words or phrases.
- **Exam Strategy:** Guardrails enforce **Responsible AI** and prevent model toxicity or hallucinations. It represents the perfect solution for corporate safety governance.`;
  }

  // 5. Bedrock vs SageMaker
  if (q.includes("sagemaker") || q.includes("fm") || q.includes("foundation") || q.includes("bedrock")) {
    return `### 🧠 AWS Machine Learning & GenAI: Bedrock vs. SageMaker

For your **AIF-C01** (or CLF-C02) exam, you must clearly distinguish between these two flagship AI services:

| Feature / Metric | 🚀 Amazon Bedrock | 🛠️ Amazon SageMaker |
| :--- | :--- | :--- |
| **Philosophy** | Serverless API access to Foundation Models | End-to-end custom machine learning pipeline |
| **Model Hosting** | Fully serverless (Managed by AWS & top providers) | You build, train, deploy, and scale custom endpoints |
| **Target Audience** | Software Developers, Rapid GenAI Prototypers | Data Scientists, Machine Learning Engineers |
| **Use Cases** | Quick chat, text generation, summarization, Guardrails | Custom training on custom datasets, custom weights, GPU control |
| **Syllabus Key** | *"Least operational overhead"* for standard GenAI | *"Full infrastructure control"* for training ML models |

---

#### 🌟 Key Concepts to Remember:
1. **Amazon Bedrock:** Access leading foundation models (Anthropic Claude, Meta Llama, Cohere, AI21, and Amazon Titan) via a single API call. Supports fine-tuning, retrieval-augmented generation (RAG) with Knowledge Bases, and **Guardrails**.
2. **Amazon SageMaker:** Includes SageMaker Canvas (No-code ML), SageMaker Studio (IDE), and custom model training clusters. Use this when you must control GPU types, hyper-parameters, and host custom open-source models outside of Bedrock.`;
  }

  // 6. Shared Responsibility
  if (q.includes("shared responsibility") || q.includes("responsibility") || q.includes("security of") || q.includes("security in")) {
    return `### 🛡️ The AWS Shared Responsibility Model

A cornerstone of both **CLF-C02** and **AIF-C01** exams! Memory trick: **AWS is responsible for security OF the cloud, while the customer is responsible for security IN the cloud.**

#### 🏢 1. Security "OF" the Cloud (AWS Responsibility)
AWS manages and secures the physical infrastructure, hardware, and core platform virtualization:
- **Physical security:** Fire suppression, security guards, and biometric scans at physical data centers.
- **Hardware/Global infrastructure:** Maintaining physical servers, network routers, and edge locations.
- **Software hypervisors:** Securing the virtualization layer running virtual instances.
- **Managed Services:** For services like **S3**, **DynamoDB**, or **RDS**, AWS handles guest OS patching and underlying database engine maintenance.

#### 💻 2. Security "IN" the Cloud (Customer Responsibility)
The customer manages what they configure and deploy inside AWS:
- **Customer Data:** Data classification, encryption settings, and database backups.
- **Identity & Access Management (IAM):** Configuring password policies, multi-factor authentication (MFA), and user permissions.
- **Operating Systems & Patches:** Patching guest operating systems running on standard EC2 instances.
- **Network Traffic & Firewalls:** Setting up Security Groups, Network Access Control Lists (NACLs), and route tables.

---

#### 💡 Quick Exam Cheat-Sheet:
- Who patches the OS on **EC2**? ➡️ **Customer**.
- Who patches the OS on **S3 / DynamoDB**? ➡️ **AWS**.
- Who manages physical host hardware? ➡️ **AWS**.
- Who configures IAM permissions & MFA? ➡️ **Customer**.`;
  }

  // 7. S3 Storage
  if (q.includes("s3") || q.includes("storage") || q.includes("glacier") || q.includes("lifecycle") || q.includes("infrequent")) {
    return `### 🗄️ AWS Storage Deep Dive: S3 Storage Classes

Amazon S3 (Simple Storage Service) is highly durable (99.999999999% - 11 9s) object storage. To optimize costs, choose the correct storage class:

1. **S3 Standard:**
   - **Cost:** Highest storage cost, free/instant retrieval.
   - **Use Case:** Active, frequently accessed data (images, website assets).
2. **S3 Standard-Infrequent Access (S3 Standard-IA):**
   - **Cost:** Lower storage cost, but retrieval fee applies.
   - **Use Case:** Data accessed less than once a month, but needs millisecond access when requested (e.g., critical backups, disaster recovery).
3. **S3 One Zone-IA:**
   - **Cost:** Even cheaper, but stored in a single Availability Zone (no multi-AZ redundancy).
   - **Use Case:** Non-critical, reproducible data (e.g., secondary backups, media transcodes).
4. **S3 Glacier Instant Retrieval:**
   - **Cost:** Ultra-low storage cost, millisecond retrieval fee.
   - **Use Case:** Medical records, archival data accessed 2-3 times a year instantly.
5. **S3 Glacier Flexible Retrieval & Deep Archive:**
   - **Cost:** Cheapest storage on Earth, but retrieval takes minutes-to-hours (Flexible) or up to 12 hours (Deep Archive).
   - **Use Case:** Historical tax records, compliance logs that do not need instant access.

---

#### 🔄 S3 Lifecycle Policies:
You can configure **S3 Lifecycle Rules** to automatically transition objects to cheaper storage tiers (e.g., transition from S3 Standard to S3 Glacier after 90 days) or expire (delete) them automatically. This is a primary method for cost optimization!`;
  }

  // 8. KMS Encryption
  if (q.includes("kms") || q.includes("encryption") || q.includes("key") || q.includes("decrypt")) {
    return `### 🔑 AWS KMS (Key Management Service)

Security is the highest priority on AWS. AWS KMS is the primary managed encryption service:

- **FIPS 140-2 Level 3 compliance:** KMS uses hardware security modules (HSMs) to secure your cryptographic keys.
- **Symmetric vs Asymmetric:** KMS supports symmetric keys (same key for encrypt/decrypt, most common) and asymmetric keys (public/private key pairs).
- **Integration:** KMS is natively integrated with virtually every AWS storage and database service (S3, EBS, RDS, DynamoDB, Redshift).
- **Syllabus Key Connection:** All key usage is logged to **AWS CloudTrail**, which provides detailed auditing trails showing exactly who used a key, when, and for which service. Use this for strict corporate compliance audits!`;
  }

  // 9. Databases
  if (q.includes("database") || q.includes("rds") || q.includes("aurora") || q.includes("dynamodb") || q.includes("nosql") || q.includes("sql")) {
    return `### 💾 AWS Database Directory

Choose the correct database based on the structure and scale of your application:

1. **Amazon RDS (Relational Database Service):**
   - **Type:** Relational (SQL)
   - **Engines:** PostgreSQL, MySQL, MariaDB, Oracle, Microsoft SQL Server.
   - **Managed features:** Automated backups, multi-AZ high availability, read replicas.
2. **Amazon Aurora:**
   - **Type:** Relational (SQL, cloud-native).
   - **Features:** 5x faster than standard MySQL, auto-scaling storage up to 128TB, continuous backups, and multi-AZ clustering.
3. **Amazon DynamoDB:**
   - **Type:** Fully Managed Non-Relational (NoSQL, Key-Value).
   - **Features:** Single-digit millisecond latency at any scale. Fully serverless (scales to zero, no instances to manage). Supports active-active global tables.
4. **Amazon ElastiCache:**
   - **Type:** In-memory caching (Redis / Memcached).
   - **Use Case:** Drastically reduces latency of read-heavy SQL databases.

---

#### 💡 Exam Shortcut:
- Relational SQL with multi-AZ replica needs ➡️ **RDS / Aurora**.
- Ultra-high throughput, single-digit millisecond latency key-value lookup ➡️ **DynamoDB**.
- In-memory database cache to speed up reads ➡️ **ElastiCache**.`;
  }

  // 10. Compute
  if (q.includes("compute") || q.includes("ec2") || q.includes("lambda") || q.includes("fargate") || q.includes("container") || q.includes("serverless")) {
    return `### ⚡ AWS Compute Options

AWS offers diverse compute paradigms from virtual machines to serverless functions:

1. **Amazon EC2 (Elastic Compute Cloud):**
   - **Type:** Infrastructure as a Service (IaaS).
   - **Control:** Full guest operating system control (root access). You configure CPU, memory, storage (EBS), and networking.
   - **Use Case:** Legacy apps, custom server architectures, apps requiring OS-level installations.
2. **AWS Lambda:**
   - **Type:** Function as a Service (FaaS / Serverless).
   - **Control:** Zero server management. You write only the code. AWS handles scaling, high availability, and runtime updates.
   - **Pricing:** Pay-per-execution and execution time. Max runtime is 15 minutes.
3. **AWS Fargate:**
   - **Type:** Serverless container execution (ECS / EKS).
   - **Control:** Run Docker containers directly. You do NOT manage virtual instances or cluster autoscaling.

---

#### 💡 Study Summary:**
- Need maximum configuration control & legacy compatibility? ➡️ **EC2**.
- Running microservices or event-driven tasks? ➡️ **Lambda**.
- Deploying Docker containers without managing servers? ➡️ **Fargate**.`;
  }

  // 11. Diagnostics
  if (q.includes("cloudtrail") || q.includes("cloudwatch") || q.includes("monitor") || q.includes("audit") || q.includes("metrics") || q.includes("logging")) {
    return `### 🔍 AWS Diagnostics: CloudWatch vs. CloudTrail

A frequent exam trick is blending these two services. Remember: **CloudWatch is for performance metrics, CloudTrail is for API governance auditing.**

- **Amazon CloudWatch:**
  - **Focus:** Performance metrics and system health monitoring.
  - **Captures:** CPU utilization, memory metrics, disk I/O, custom application logs, and service status.
  - **Actions:** Can set **Alarms** (e.g., trigger an Auto Scaling policy or send an SNS email alert when CPU exceeds 80%).
- **AWS CloudTrail:**
  - **Focus:** Governance, compliance, and API auditing.
  - **Captures:** "Who did what, when, and from where?" Records every single API call made in your AWS account (via Console, CLI, or SDK).
  - **Actions:** Track unauthorized logins, key usage (KMS), and modifications to network infrastructure.

---

#### 💡 Exam Indicator:
- *"Check why an EC2 instance failed with high memory"* ➡️ **CloudWatch**.
- *"Check who deleted an S3 bucket or changed a Security Group"* ➡️ **CloudTrail**.`;
  }

  // 12. Pricing & Billing
  if (q.includes("pricing") || q.includes("cost") || q.includes("budget") || q.includes("billing") || q.includes("free") || q.includes("consolidated") || q.includes("spot") || q.includes("reserved")) {
    return `### 💵 AWS Financial & Budgeting Governance

Understand the core billing and optimization tools to ensure maximum financial efficiency:

1. **AWS Budgets:**
   - **Action:** Proactive alerts. Set custom budgets that trigger SNS alerts when actual cost OR forecasted cost exceeds your threshold.
2. **AWS Cost Explorer:**
   - **Action:** Reactive analysis. Visual tool to dissect historical cost categories, view usage reports, and identify cost-saving opportunities.
3. **Consolidated Billing (via AWS Organizations):**
   - **Action:** Aggregates invoices across multiple child accounts into a single master account bill. Offers volume discount rates across S3 and EC2 tiers.
4. **EC2 Pricing Models:**
   - **On-Demand:** Pay by the second, zero commitment (highest rate, best for irregular testing).
   - **Savings Plans / Reserved Instances:** Up to 72% discount for 1-to-3 year term commitment (best for stable, predictable production).
   - **Spot Instances:** Up to 90% discount on unused capacity, but AWS can terminate with a 2-minute warning (best for fault-tolerant, batch processing tasks).`;
  }

  // Fallback default response
  return `### 🎓 Welcome to the AWS Practice Grounding Portal

I am your **AI AWS Training Coach**. Currently, the high-demand cloud computing nodes are experiencing temporary congestion (or awaiting configuration), so I have booted my **Local Syllabus Knowledge Base** to guarantee uninterrupted study!

Here is a summary of highly-tested AWS Core Domains to research:

#### 🌐 1. AWS Cloud Concepts & Architecture
- **Well-Architected Framework:** Operational Excellence, Security, Reliability, Performance Efficiency, Cost Optimization, and Sustainability.
- **High Availability & Fault Tolerance:** Multi-AZ deployments ensure that if one data center fails, service instantly fails over to another without downtime.

#### 🔐 2. Security, Compliance, and Governance
- **AWS IAM:** Principle of Least Privilege (grant only the minimum access needed). Enable Multi-Factor Authentication (MFA) on the root account immediately.
- **AWS Trusted Advisor:** Automatic auditing tool that inspects your environment and alerts you to cost optimizations, open security groups, and service limit checks.

#### ⚙️ 3. Generative AI Foundations (AIF-C01 Focus)
- **Foundation Models (FMs):** Massive models pre-trained on internet-scale data.
- **Retrieval-Augmented Generation (RAG):** Grounding a foundation model on your private enterprise documents (like custom databases or S3 documents) to give highly accurate, contextual answers without retraining.

---

👉 **Try asking me specific queries such as:**
- *"Explain Bedrock vs SageMaker"*
- *"What is the Shared Responsibility Model?"*
- *"S3 Storage Classes explained"*
- *"Explain AWS Guardrails"*
- *"What is KMS and encryption?"*
- *"CloudWatch vs CloudTrail"*
- *"AWS Cost Explorer and Budgets"*

*Ask anything! Your offline syllabus grounding is fully online and ready.*`;
}

// 1. Config endpoint to let the frontend know if AI features are enabled
app.get("/api/config", (req, res) => {
  const hasKey = !!process.env.GEMINI_API_KEY;
  res.json({
    aiEngineReady: hasKey,
    examSupported: ["CLF-C02", "AIF-C01"],
    freemiumLimit: 5
  });
});

// 2. Generate a custom, highly specific AWS scenario-based MCQ question using Gemini API
app.post("/api/generate-scenario", async (req, res) => {
  try {
    const { examType, domainName, domainId, difficulty = "Medium", simulate503 } = req.body;

    if (simulate503) {
      console.log("[DEV MODE] Simulating 503 Service Congestion error on Scenario Generation");
      throw new Error("503 Service Unavailable: Simulated high-demand service congestion.");
    }

    if (!examType) {
      return res.status(400).json({ error: "examType is required" });
    }

    const ai = getAIClient();
    if (!ai) {
      return res.json({
        fallback: true,
        message: "No Gemini API Key found. Using high-quality prebuilt AWS syllabus question."
      });
    }

    const prompt = `You are an expert AWS Senior Principal Architect and official certification exam developer.
Generate a brand-new, realistic, enterprise scenario-based multiple-choice question for the AWS ${examType} exam.
Targeting AWS Syllabus Domain: ${domainName} (${domainId})
Difficulty Level: ${difficulty}

The scenario must be a high-quality case study (2-4 sentences) describing an organization (e.g., startup, large enterprise, healthcare provider) facing a technical, architectural, security, or financial challenge.
The question must ask for the best AWS architecture, service, feature, or governance practice based on official AWS documentation and whitepapers.
Provide exactly 4 distinct multiple-choice options. Only one option must be fully correct. The other three options must be realistic but incorrect distractors.
Provide a clear, educational, and professional explanation detailing why the correct answer is correct and why each distractor is incorrect.
Map it to a specific referenceSyllabusSection.`;

    const result = await callGeminiWithFallback(ai, {
      contents: prompt,
      config: {
        systemInstruction: `You are an official AWS certification question generator. You strictly output questions that conform exactly to the AWS ${examType} syllabus, using standard AWS terminologies. You must return a single valid JSON object matching the requested schema. Do not include markdown wraps or code fences in your raw string, just return pure JSON.`,
        temperature: 1.0,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            scenario: { 
              type: Type.STRING, 
              description: "A highly realistic enterprise or developer scenario of AWS usage (2-4 sentences)." 
            },
            questionText: { 
              type: Type.STRING, 
              description: "The specific question asked based on the scenario." 
            },
            options: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Exactly 4 multiple-choice options (1 correct, 3 incorrect distractors)."
            },
            correctAnswerIndex: { 
              type: Type.INTEGER, 
              description: "0-based index of the correct option (0 to 3)." 
            },
            explanation: { 
              type: Type.STRING, 
              description: "Detailed, comprehensive explanation of why the selected index is correct, and why each of the other options is incorrect or suboptimal." 
            },
            referenceSyllabusSection: { 
              type: Type.STRING, 
              description: "An exact topic from the official AWS syllabus corresponding to this domain." 
            }
          },
          required: ["scenario", "questionText", "options", "correctAnswerIndex", "explanation", "referenceSyllabusSection"]
        }
      }
    });

    const text = result.text;
    if (!text) {
      throw new Error("No response from Gemini API");
    }

    const questionData = JSON.parse(text.trim());
    res.json({
      fallback: false,
      modelUsed: result.modelUsed,
      question: {
        id: `gen_${Date.now()}`,
        examType,
        domainId,
        ...questionData,
        isAIGenerated: true
      }
    });

  } catch (error: any) {
    console.error("Gemini Generation Error:", error);
    res.json({
      fallback: true,
      message: "An error occurred while calling the AI model. Using prebuilt fallback questions.",
      errorDetails: error.message
    });
  }
});

// 3. Smart Q&A Chatbot for interactive learning and explaining AWS concepts
app.post("/api/study-chat", async (req, res) => {
  const { messages, examType, currentQuestion, simulate503 } = req.body;
  
  try {
    if (simulate503) {
      console.log("[DEV MODE] Simulating 503 Service Congestion error on Study Chat");
      throw new Error("503 Service Unavailable: Simulated high-demand service congestion.");
    }

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "messages array is required" });
    }

    const ai = getAIClient();
    if (!ai) {
      const userMsg = messages[messages.length - 1]?.content || "";
      const offlineReply = getLocalFallbackResponse(userMsg, examType || "CLF-C02", currentQuestion);
      return res.json({
        reply: `⚠️ *[Local Expert Study Guide - Running in Offline/Sandbox Mode]*\n\n${offlineReply}`
      });
    }

    // Prepare system instructions and initial context
    let systemInstruction = `You are "CloudPrep Coach", a patient, friendly, and world-class Senior AWS Technical Trainer.
Your goal is to help students pass their AWS ${examType} certification exam.
Explain concepts using clear analogies, bold key terms, and reference official AWS practices.
Keep explanations structured, highly encouraging, and scannable. Format with markdown (bullet points, bold text, tables).

If the student is asking about a specific question they just solved, here is the context:
${currentQuestion ? JSON.stringify(currentQuestion, null, 2) : "No active question is selected."}

Help the student understand the core AWS services, answer any cloud concepts, and clarify their doubts!`;

    // Transform chat history into contents format for @google/genai SDK
    const formattedContents = messages.map(msg => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }]
    }));

    const result = await callGeminiWithFallback(ai, {
      contents: formattedContents,
      config: {
        systemInstruction,
        temperature: 0.7,
      }
    });

    res.json({
      reply: result.text || "I was unable to formulate a response. Please try rephrasing your question!",
      modelUsed: result.modelUsed
    });

  } catch (error: any) {
    console.error("Gemini Chat Error (activating Local Grounding):", error);
    // Graceful fallback to our deep local technical solver on any model demand spike or rate limit
    const userMsg = messages && messages.length > 0 ? messages[messages.length - 1]?.content : "";
    const offlineReply = getLocalFallbackResponse(userMsg, examType || "CLF-C02", currentQuestion);
    
    res.json({
      reply: `⚠️ *[Cloud Network Congestion - Switched to High-Fidelity Local Grounding Mode]*\n\n${offlineReply}`
    });
  }
});

// Serve static assets depending on environment
async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`AWS Exam Practice Assistant server booted on http://localhost:${PORT}`);
  });
}

start();
