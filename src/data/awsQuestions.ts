import { AWSExamType, ExamDomain, AWSQuestion, Flashcard } from '../types';

export const AWS_DOMAINS: Record<AWSExamType, ExamDomain[]> = {
  'CLF-C02': [
    {
      id: 'CLF_D1',
      name: 'Domain 1: Cloud Technology and Concepts',
      percentage: 24,
      description: 'Covers the AWS Well-Architected Framework, cloud benefits, Shared Responsibility Model, and migration strategies.',
      topics: ['AWS Well-Architected Framework', 'Shared Responsibility Model', 'AWS Cloud Adoption Framework (AWS CAF)', 'Benefits of the AWS Cloud']
    },
    {
      id: 'CLF_D2',
      name: 'Domain 2: Security and Compliance',
      percentage: 30,
      description: 'Covers identity and access management, security logging, encryption, compliance, and core AWS security services.',
      topics: ['AWS IAM', 'AWS KMS', 'AWS Secrets Manager', 'AWS Shield & AWS WAF', 'Security Groups & Network ACLs', 'AWS Artifact']
    },
    {
      id: 'CLF_D3',
      name: 'Domain 3: Cloud Infrastructure and Services',
      percentage: 34,
      description: 'Covers compute (EC2, Lambda, ECS), storage (S3, EBS, EFS), databases (RDS, DynamoDB), and networking (VPC, CloudFront, Route 53).',
      topics: ['Amazon EC2 & AWS Lambda', 'Amazon S3 & EBS', 'Amazon RDS & DynamoDB', 'Amazon VPC & CloudFront', 'Route 53 & ELB']
    },
    {
      id: 'CLF_D4',
      name: 'Domain 4: Billing, Pricing, and Support',
      percentage: 12,
      description: 'Covers AWS pricing models, billing structures, organizations, cost management tools, and support plans.',
      topics: ['AWS Budgets', 'AWS Cost Explorer', 'AWS Organizations', 'AWS Support Plans']
    }
  ],
  'AIF-C01': [
    {
      id: 'AIF_D1',
      name: 'Domain 1: Cloud Concepts and AI/ML Basics',
      percentage: 22,
      description: 'Covers fundamental AI/ML concepts, generative AI vs. traditional machine learning, deep learning, NLP, computer vision, and the ML lifecycle.',
      topics: ['Traditional ML vs Generative AI', 'Deep Learning & Neural Networks', 'Natural Language Processing (NLP)', 'Machine Learning Lifecycle']
    },
    {
      id: 'AIF_D2',
      name: 'Domain 2: AI/ML on AWS',
      percentage: 36,
      description: 'Covers core AWS AI/ML services: Amazon Bedrock, SageMaker, Rekognition, Polly, Lex, Comprehend, Q, and custom chips.',
      topics: ['Amazon Bedrock', 'Amazon SageMaker', 'Amazon Q Business', 'AWS Trainium & Inferentia', 'AWS Polly, Lex, and Rekognition']
    },
    {
      id: 'AIF_D3',
      name: 'Domain 3: Security, Compliance, and Governance for AI/ML',
      percentage: 26,
      description: 'Covers responsible AI, model bias, input/output data protection, Bedrock Guardrails, model evaluations, and legal compliance.',
      topics: ['Responsible AI (Bias, Fairness, Explainability)', 'Amazon Bedrock Guardrails', 'SageMaker Model Cards', 'Data Privacy & Encryption in Bedrock']
    },
    {
      id: 'AIF_D4',
      name: 'Domain 4: Billing and Pricing for AI/ML',
      percentage: 16,
      description: 'Covers Bedrock pricing models (On-Demand, Provisioned Throughput), SageMaker savings plans, and cost optimization for ML workloads.',
      topics: ['Amazon Bedrock Pricing (Tokens)', 'SageMaker Instances & Savings Plans', 'Cost Optimization for AI/ML workloads']
    }
  ]
};

export const PREBUILT_QUESTIONS: AWSQuestion[] = [
  // CLF-C02 Domain 1
  {
    id: 'clf_q1',
    examType: 'CLF-C02',
    domainId: 'CLF_D1',
    scenario: 'A fintech startup is designing a mobile payment processor and needs high availability across multiple geographical locations. They want to ensure that even if an entire AWS Data Center goes offline due to a physical disaster, the payment application remains fully functional without user intervention.',
    questionText: 'Which AWS architectural design principles best fulfill this requirement?',
    options: [
      'Deploying the application across multiple Edge Locations using Amazon CloudFront.',
      'Deploying the application across multiple Availability Zones (AZs) within an AWS Region.',
      'Deploying the application on a single oversized EC2 instance with high network throughput.',
      'Hosting the database on-premises and caching files with Amazon S3 Glacier.'
    ],
    correctAnswerIndex: 1,
    explanation: 'Deploying across multiple Availability Zones (AZs) is a fundamental AWS practice for achieving high availability and fault tolerance. AZs are physically distinct locations engineered to be isolated from failures in other AZs. Edge locations cache content and are not intended for multi-AZ resilient application compute hosting.',
    referenceSyllabusSection: 'AWS Well-Architected Framework - Reliability Pillar'
  },
  {
    id: 'clf_q2',
    examType: 'CLF-C02',
    domainId: 'CLF_D1',
    scenario: 'An IT director is evaluating a migration to AWS. The security team is highly concerned about the physical security of the underlying infrastructure, operating system hypervisor patching, and physical storage destruction.',
    questionText: 'Under the AWS Shared Responsibility Model, which of these concerns is the sole responsibility of AWS?',
    options: [
      'Patching the guest operating systems on Amazon EC2 instances.',
      'Enforcing Multi-Factor Authentication (MFA) for the root account.',
      'Physical security of the data center and hypervisor management.',
      'Configuring network security groups and ACLs.'
    ],
    correctAnswerIndex: 2,
    explanation: 'Under the Shared Responsibility Model, AWS is responsible for security "of" the cloud (physical infrastructure, hypervisor virtualization layer, hardware decommissioning), while the customer is responsible for security "in" the cloud (guest OS patching, IAM policies, MFA, and Security Group configurations).',
    referenceSyllabusSection: 'AWS Shared Responsibility Model'
  },

  // CLF-C02 Domain 2
  {
    id: 'clf_q3',
    examType: 'CLF-C02',
    domainId: 'CLF_D2',
    scenario: 'A web portal expects a major DDoS attack during an upcoming product launch. They need to protect their application layer (Layer 7) against malicious SQL injection and Cross-Site Scripting (XSS) requests.',
    questionText: 'Which AWS security service is best suited to inspect and block this traffic?',
    options: [
      'AWS Shield Standard',
      'AWS Shield Advanced',
      'AWS WAF (Web Application Firewall)',
      'Amazon GuardDuty'
    ],
    correctAnswerIndex: 2,
    explanation: 'AWS WAF is designed to protect web applications against common web exploits at the application layer (Layer 7), including SQL injection and XSS. AWS Shield Standard and Advanced operate primarily at Layer 3 and Layer 4 to block volumetric DDoS attacks. Amazon GuardDuty is an intelligent threat detection service, not an inline traffic blocking firewall.',
    referenceSyllabusSection: 'AWS Security - WAF vs Shield'
  },
  {
    id: 'clf_q4',
    examType: 'CLF-C02',
    domainId: 'CLF_D2',
    scenario: 'A regulatory audit requires an organization to generate and store cryptographic keys that only their designated administrators can manage, with AWS having zero visibility or administrative ability to decrypt the stored materials.',
    questionText: 'Which service or configuration meets this high-security standard?',
    options: [
      'AWS KMS with AWS Managed Keys',
      'AWS CloudHSM',
      'Amazon S3 Server-Side Encryption (SSE-S3)',
      'AWS Secrets Manager with default rotation'
    ],
    correctAnswerIndex: 1,
    explanation: 'AWS CloudHSM provides dedicated Hardware Security Module (HSM) instances within the AWS cloud that you fully control and manage. Unlike AWS KMS (which is multi-tenant and managed by AWS), CloudHSM keys are managed exclusively by the customer. AWS has no administrative credentials or access to CloudHSM instances.',
    referenceSyllabusSection: 'AWS Key Management and Compliance'
  },

  // CLF-C02 Domain 3
  {
    id: 'clf_q5',
    examType: 'CLF-C02',
    domainId: 'CLF_D3',
    scenario: 'A developer wants to deploy a simple scheduled microservice that runs every hour to clean up temporary logs from an S3 bucket. The execution takes less than 30 seconds and requires minimal CPU.',
    questionText: 'What is the most cost-effective and operationally simple compute service for this workload?',
    options: [
      'Run a persistent Amazon EC2 t3.micro instance.',
      'Deploy the script as a containerized service inside Amazon ECS on AWS Fargate.',
      'Write the script as an AWS Lambda function triggered by Amazon EventBridge schedules.',
      'Deploy the script on an Elastic Beanstalk web environment.'
    ],
    correctAnswerIndex: 2,
    explanation: 'AWS Lambda is a serverless event-driven compute service that runs code only when triggered, charging only for the milliseconds of compute consumed. Since the script runs hourly for just 30 seconds, Lambda triggered by EventBridge schedules requires no server provisioning or active maintenance, making it the most cost-effective option.',
    referenceSyllabusSection: 'AWS Serverless Compute - Lambda'
  },
  {
    id: 'clf_q6',
    examType: 'CLF-C02',
    domainId: 'CLF_D3',
    scenario: 'A multinational firm is building a media website. They have raw high-definition video assets stored in Amazon S3, and want to cache these files at over 400 edge locations globally to minimize buffering for users worldwide.',
    questionText: 'Which AWS service is specifically engineered to solve this latency problem?',
    options: [
      'AWS Global Accelerator',
      'Amazon Route 53 latency routing',
      'Amazon CloudFront',
      'S3 Transfer Acceleration'
    ],
    correctAnswerIndex: 2,
    explanation: 'Amazon CloudFront is the CDN (Content Delivery Network) service in AWS. It caches static and dynamic content at edge locations worldwide, drastically reducing latency for users requesting S3 assets. AWS Global Accelerator improves TCP/UDP routing, and S3 Transfer Acceleration speeds up S3 file uploads, not globally distributed media caching.',
    referenceSyllabusSection: 'AWS Content Delivery & Global Infrastructure'
  },

  // CLF-C02 Domain 4
  {
    id: 'clf_q7',
    examType: 'CLF-C02',
    domainId: 'CLF_D4',
    scenario: 'A company has multiple separate business units, each with its own AWS account. The CFO wants to streamline payments by receiving a single combined invoice, while also gaining volume discounts for shared S3 storage across all accounts.',
    questionText: 'Which AWS capability allows them to achieve both objectives?',
    options: [
      'AWS Cost Explorer custom tagging',
      'AWS Budgets alerts',
      'Consolidated Billing via AWS Organizations',
      'S3 Lifecycle policies with cross-region replication'
    ],
    correctAnswerIndex: 2,
    explanation: 'Consolidated Billing is a feature of AWS Organizations that aggregates the charges of multiple linked member accounts into a single invoice. It also enables volume pricing discounts by summing the usage (such as S3 storage gigabytes) across all consolidated accounts to qualify for lower pricing tiers.',
    referenceSyllabusSection: 'AWS Billing & Organizations'
  },
  {
    id: 'clf_q8',
    examType: 'CLF-C02',
    domainId: 'CLF_D4',
    scenario: 'A company is launching a new pilot program and wants to compare costs from the previous quarter. They want to forecast their AWS charges for the next 3 months based on current trends and identify resource usage anomalies.',
    questionText: 'Which AWS cost tool should they utilize for forecasting and trend analysis?',
    options: [
      'AWS Cost Explorer',
      'AWS Budgets',
      'AWS Pricing Calculator',
      'AWS Billing Conductor'
    ],
    correctAnswerIndex: 0,
    explanation: 'AWS Cost Explorer is a free visual tool that allows you to analyze historical costs, track monthly usage trends, forecast future costs for up to 12 months, and receive recommendations on cost savings. AWS Budgets is for setting spending limits and alerting, while the Pricing Calculator is for estimating costs before launching resources.',
    referenceSyllabusSection: 'AWS Cost Management Tools'
  },

  // AIF-C01 Domain 1
  {
    id: 'aif_q1',
    examType: 'AIF-C01',
    domainId: 'AIF_D1',
    scenario: 'A software company wants to build a generative AI feature. They are trying to decide whether to train a deep neural network from scratch or use pre-trained Foundation Models (FMs). The team wants to understand the relationship between traditional machine learning and Generative AI.',
    questionText: 'Which statement correctly defines how Generative AI relates to broader Artificial Intelligence concepts?',
    options: [
      'Generative AI is a subset of Deep Learning that uses transformers and neural networks to create brand new content, such as text, images, or code.',
      'Generative AI completely replaces traditional Machine Learning, which is no longer applicable to data regression or classification.',
      'Generative AI models do not use neural networks; they rely entirely on hard-coded heuristics and vector retrieval.',
      'Generative AI is the broader field, and Deep Learning and Machine Learning are specialized subsets of generative models.'
    ],
    correctAnswerIndex: 0,
    explanation: 'Generative AI is a specific subset of Deep Learning, which itself is a subset of Machine Learning, under the broad umbrella of Artificial Intelligence. FMs and LLMs use deep neural networks (specifically transformer architectures) to generate new, original content rather than just classifying or predicting values from inputs.',
    referenceSyllabusSection: 'Domain 1: Generative AI Concepts & Neural Networks'
  },
  {
    id: 'aif_q2',
    examType: 'AIF-C01',
    domainId: 'AIF_D1',
    scenario: 'During model development, an AI engineer notices that their text model keeps repeating the exact same phrases when summarizing articles, and is highly rigid. They want to adjust how "creative" or "unpredictable" the model\'s next-token selection is.',
    questionText: 'Which hyperparameter controls this trade-off between randomness/creativity and deterministic predictions?',
    options: [
      'Epochs',
      'Learning Rate',
      'Temperature',
      'Batch Size'
    ],
    correctAnswerIndex: 2,
    explanation: 'Temperature is a decoding hyperparameter that controls the creativity or randomness of a model\'s output. A low temperature makes the output deterministic and focused, choosing the most likely token. A high temperature flattens the probability distribution, introducing variety and creativity. Epochs and Learning Rate are training hyperparameters, not generation hyperparameters.',
    referenceSyllabusSection: 'Domain 1: Decoding Hyperparameters'
  },

  // AIF-C01 Domain 2
  {
    id: 'aif_q3',
    examType: 'AIF-C01',
    domainId: 'AIF_D2',
    scenario: 'A global logistics company wants to integrate generative AI capabilities. They need a single, unified API to access leading Foundation Models from third parties (like Anthropic, Meta, and Cohere) as well as Amazon\'s own Titan models, without managing any infrastructure.',
    questionText: 'Which fully managed AWS service should they utilize to achieve this unified foundation model integration?',
    options: [
      'Amazon SageMaker Studio',
      'Amazon Bedrock',
      'Amazon Lex',
      'Amazon Comprehend'
    ],
    correctAnswerIndex: 1,
    explanation: 'Amazon Bedrock is a fully managed AWS service that offers a single, unified API to access high-performing foundation models (FMs) from leading AI startups (like Anthropic Claude, Meta Llama, Cohere, AI21 Labs) and Amazon Titan. This avoids the overhead of server management or manual model hosting.',
    referenceSyllabusSection: 'Domain 2: Amazon Bedrock Capabilities'
  },
  {
    id: 'aif_q4',
    examType: 'AIF-C01',
    domainId: 'AIF_D2',
    scenario: 'A company wants to build an internal knowledge assistant. The assistant must answer user queries by searching their private internal SharePoint and Confluence documents, then feeding that context to an LLM to formulate a grounded response.',
    questionText: 'What AWS service and technique best satisfies this Retrieval-Augmented Generation (RAG) requirement with zero-infrastructure pipeline setup?',
    options: [
      'Train a brand new Claude model on AWS Trainium chips.',
      'Use Knowledge Bases for Amazon Bedrock connected to an S3 or SharePoint data source.',
      'Use Amazon Polly to read files out loud and record the audio with Amazon Transcribe.',
      'Configure an AWS Lambda function to query Amazon RDS directly using standard SQL.'
    ],
    correctAnswerIndex: 1,
    explanation: '"Knowledge Bases for Amazon Bedrock" is a fully managed workflow that automates RAG. It handles document ingestion, chunking, vector embedding, storage in a vector database (like OpenSearch Serverless), semantic search retrieval, and LLM orchestration automatically without requiring custom coding.',
    referenceSyllabusSection: 'Domain 2: Bedrock Knowledge Bases & RAG'
  },

  // AIF-C01 Domain 3
  {
    id: 'aif_q5',
    examType: 'AIF-C01',
    domainId: 'AIF_D3',
    scenario: 'A customer support department is introducing Amazon Bedrock. Their legal team is concerned about "Responsible AI" and wants to ensure that: 1. PII (Personally Identifiable Information) is automatically masked. 2. Users cannot trigger toxic topics or prompt injections. 3. Answers are strictly filtered for hate speech and violence.',
    questionText: 'Which native Amazon Bedrock feature allows administrators to define and enforce these safety and alignment safeguards across all foundation models?',
    options: [
      'Amazon Bedrock Model Evaluation',
      'Amazon Bedrock Guardrails',
      'AWS IAM Resource Policies',
      'SageMaker Model Cards'
    ],
    correctAnswerIndex: 1,
    explanation: 'Amazon Bedrock Guardrails enables you to implement tailored safeguards, content filters, and PII masking policies on Bedrock foundation models. It is model-agnostic and actively blocks toxic prompts, model hallucinations, profanity, and sensitive business topics to enforce Responsible AI principles.',
    referenceSyllabusSection: 'Domain 3: Amazon Bedrock Guardrails & Responsible AI'
  },
  {
    id: 'aif_q6',
    examType: 'AIF-C01',
    domainId: 'AIF_D3',
    scenario: 'An insurance company is deploying a machine learning model to predict claims processing approvals. To satisfy government transparency audits, the model must include detailed documentation explaining its training dataset sources, intended use-cases, evaluation metrics, and potential biases.',
    questionText: 'Which AWS feature should the team generate and publish to provide this standardized, transparent documentation?',
    options: [
      'AWS Artifact reports',
      'SageMaker Model Cards',
      'Amazon Bedrock Guardrails policy logs',
      'AWS CloudTrail auditable events'
    ],
    correctAnswerIndex: 1,
    explanation: 'SageMaker Model Cards are a specialized feature within SageMaker to document model details (including intended use, risk ratings, training details, evaluation results, and bias assessments). This acts as a single, centralized source of truth for governance, transparency, and model audits.',
    referenceSyllabusSection: 'Domain 3: AI/ML Governance & SageMaker Model Cards'
  },

  // AIF-C01 Domain 4
  {
    id: 'aif_q7',
    examType: 'AIF-C01',
    domainId: 'AIF_D4',
    scenario: 'An enterprise is deploying Amazon Bedrock for high-volume automated invoice summarizing. They expect to process millions of transactions monthly, and want to predict Bedrock operational costs.',
    questionText: 'How is pricing calculated for standard serverless on-demand foundation model usage on Amazon Bedrock?',
    options: [
      'Based on the flat hourly runtime of the Bedrock API servers.',
      'Based on the size of the model in gigabytes multiplied by CPU hours.',
      'Based on the number of input tokens processed and output tokens generated.',
      'Based on the number of documents stored in S3 regardless of requests.'
    ],
    correctAnswerIndex: 2,
    explanation: 'On-Demand foundation model usage on Amazon Bedrock is priced on a pay-as-you-go basis, specifically calculated per-1,000 input tokens processed and per-1,000 output tokens generated. Tokens are chunks of characters representing words or sub-words.',
    referenceSyllabusSection: 'Domain 4: Amazon Bedrock Pricing Model'
  },
  {
    id: 'aif_q8',
    examType: 'AIF-C01',
    domainId: 'AIF_D4',
    scenario: 'A company has a steady, predictable generative AI workload running 24/7. They need a guaranteed latency SLA for their applications and want to lock in a dedicated capacity reservation for a specific foundation model on Bedrock.',
    questionText: 'Which purchasing option provides dedicated model throughput with a 1-month or 6-month commitment?',
    options: [
      'On-Demand Throughput',
      'Provisioned Throughput',
      'AWS Savings Plans',
      'Spot Throughput instances'
    ],
    correctAnswerIndex: 1,
    explanation: 'Provisioned Throughput provides dedicated model capacity with a specific number of model units (MU) allocated to your AWS account. It guarantees throughput/latency SLAs, and requires a commitment of 1-month or 6-months, making it ideal for continuous, high-priority production workloads.',
    referenceSyllabusSection: 'Domain 4: Provisioned Throughput on Bedrock'
  }
];

export const PREBUILT_FLASHCARDS: Flashcard[] = [
  {
    id: 'fc_clf_1',
    examType: 'CLF-C02',
    domainId: 'CLF_D1',
    term: 'Shared Responsibility Model',
    definition: 'Security OF the Cloud vs. Security IN the Cloud.',
    explanation: 'AWS manages the physical infrastructure, virtualization, host OS, and global edge network. Customers manage guest OS, application software, IAM accounts, data encryption, and network configurations.'
  },
  {
    id: 'fc_clf_2',
    examType: 'CLF-C02',
    domainId: 'CLF_D2',
    term: 'AWS KMS (Key Management Service)',
    definition: 'Managed encryption key creation and administration.',
    explanation: 'FIPS 140-2 validated hardware HSM modules generate keys. Integrated with S3, EBS, and RDS to encrypt data-at-rest. Can manage customer-managed or AWS-managed keys.'
  },
  {
    id: 'fc_clf_3',
    examType: 'CLF-C02',
    domainId: 'CLF_D3',
    term: 'AWS Lambda',
    definition: 'Serverless event-driven compute service.',
    explanation: 'Executes code only when triggered (by S3 uploads, HTTP via API Gateway, schedules). Zero administration of servers, scales automatically, billed per ms.'
  },
  {
    id: 'fc_clf_4',
    examType: 'CLF-C02',
    domainId: 'CLF_D2',
    term: 'AWS IAM',
    definition: 'Identity and Access Management controls for user access.',
    explanation: 'Enables fine-grained permissions for users, groups, and roles. Implements the Principle of Least Privilege. Free of charge globally.'
  },
  {
    id: 'fc_clf_5',
    examType: 'CLF-C02',
    domainId: 'CLF_D3',
    term: 'Amazon S3',
    definition: 'Highly durable, scalable flat-file object storage service.',
    explanation: 'Offers 99.999999999% (11 9s) of durability. Stores data as objects in containers called Buckets. Supports lifecycle policies, static hosting, and versioning.'
  },
  {
    id: 'fc_clf_6',
    examType: 'CLF-C02',
    domainId: 'CLF_D3',
    term: 'Amazon EC2',
    definition: 'Secure, resizable infrastructure-as-a-service virtual servers.',
    explanation: 'Provides virtual computers (instances) with complete administrative root access. Billed per second. Requires selecting an AMI (Amazon Machine Image).'
  },
  {
    id: 'fc_clf_7',
    examType: 'CLF-C02',
    domainId: 'CLF_D2',
    term: 'AWS Shield',
    definition: 'Managed Distributed Denial of Service (DDoS) protection.',
    explanation: 'Standard shield is enabled automatically for all AWS customers at no extra cost. Shield Advanced provides higher layer protection, SLAs, and DDoS response team (DRT) access.'
  },
  {
    id: 'fc_clf_8',
    examType: 'CLF-C02',
    domainId: 'CLF_D4',
    term: 'AWS Budgets',
    definition: 'Set custom cost and usage limits with proactive alerts.',
    explanation: 'Tracks AWS costs or usage and alerts you when your actual or forecasted spend exceeds custom thresholds. Supports SNS notifications or email.'
  },
  {
    id: 'fc_aif_1',
    examType: 'AIF-C01',
    domainId: 'AIF_D1',
    term: 'Retrieval-Augmented Generation (RAG)',
    definition: 'Injecting external knowledge documents into the prompt.',
    explanation: 'Retrieves relevant text chunks from private search indexes or vector databases (like S3/OpenSearch) and appends them to user query so the LLM outputs factual, context-grounded answers without hallucinating.'
  },
  {
    id: 'fc_aif_2',
    examType: 'AIF-C01',
    domainId: 'AIF_D2',
    term: 'Amazon Bedrock',
    definition: 'Serverless API for leading foundation models.',
    explanation: 'Gives single API access to Anthropic Claude, Meta Llama, Cohere, Stability AI, and Amazon Titan. Serverless, secure, private data customization.'
  },
  {
    id: 'fc_aif_3',
    examType: 'AIF-C01',
    domainId: 'AIF_D3',
    term: 'Bedrock Guardrails',
    definition: 'Responsible AI safety and content filters.',
    explanation: 'Applies user-defined filters to block toxic inputs, prevent model hallucinations on sensitive topics, redact standard or custom PII data, and reject inappropriate user behavior across all Bedrock foundation models.'
  },
  {
    id: 'fc_aif_4',
    examType: 'AIF-C01',
    domainId: 'AIF_D2',
    term: 'Amazon SageMaker',
    definition: 'Comprehensive ML platform to build, train, and deploy models.',
    explanation: 'Provides integrated tools for the entire ML lifecycle: SageMaker Canvas (no-code), Notebooks, Model Training, Pipelines, and endpoint hosting.'
  },
  {
    id: 'fc_aif_5',
    examType: 'AIF-C01',
    domainId: 'AIF_D2',
    term: 'AWS Trainium',
    definition: 'Custom AWS silicon chip optimized for deep learning training.',
    explanation: 'AWS-designed accelerator for machine learning model training in EC2. Provides high-throughput, energy-efficient operations compared to generic GPUs.'
  },
  {
    id: 'fc_aif_6',
    examType: 'AIF-C01',
    domainId: 'AIF_D2',
    term: 'Amazon Q Business',
    definition: 'Generative AI-powered conversational workspace assistant.',
    explanation: 'Securely connects to your enterprise data sources, summarizing answers, generating drafts, and executing tasks aligned with user access permissions.'
  },
  {
    id: 'fc_aif_7',
    examType: 'AIF-C01',
    domainId: 'AIF_D1',
    term: 'Overfitting',
    definition: 'When a model learns noise in training data instead of general patterns.',
    explanation: 'Characterized by high accuracy on training datasets but poor generalization performance on unseen test datasets. Remedied by regularization or dropout.'
  },
  {
    id: 'fc_aif_8',
    examType: 'AIF-C01',
    domainId: 'AIF_D1',
    term: 'Prompt Engineering',
    definition: 'Structuring textual inputs to optimize LLM outputs.',
    explanation: 'Crafting instructions, context, examples (few-shot), and output specifications to guide Foundation Models to yield highly accurate and formatted responses.'
  }
];
