const { Router } = require("express");
const router = Router();
const multer = require("multer");
const ai = require("../services/gemini")
const { PDFParse } = require("pdf-parse");
// console.log(pdf);

const upload = multer({
    storage: multer.memoryStorage()
});

router.post('/analyse', upload.single("resume"), async (req, res) => {
    try {
        const resumeFile = req.file;
        if (!resumeFile) {
            return res.status(400).json({ error: "No resume file provided." });
        }

        const parser = new PDFParse({
            data: resumeFile.buffer
        });

        const resumeText = await parser.getText();
    console.log("resume text", resumeText);

        await parser.destroy();

        const prompt = `
You are an ATS Resume Analyzer.

Analyze the following resume.

Return ONLY valid JSON.

{
    "atsScore": number,
    "summary": "",
    "strengths": [],
    "weaknesses": [],
    "missingKeywords": [],
    "suggestions": []
}

Resume:

${resumeText.text}
`;

    const interaction = await ai.interactions.create({
        model: "gemini-3.6-flash",
        input: prompt
        });

    // console.log("response from gemini", interaction);

    const response = interaction.output_text;

    // console.log("output text from response", response);

    const result = JSON.parse(response);
    console.log(result);
        return res.json(result);
}
catch (err) {
    console.error("Error in /analyse:", err);
    return res.status(500).json({
        error: err.message || "Failed to analyze resume."
    });
}
});


router.post('/questionsFromProject', upload.single("resume"), async (req, res) => {
    try {
        const resumeFile = req.file;
        if (!resumeFile) {
            return res.status(400).json({ error: "No resume file provided." });
        }

        const parser = new PDFParse({
            data: resumeFile.buffer
        });
        const resumeText = await parser.getText();
        await parser.destroy();

        const prompt = `
You are an interviewer preparing questions for a candidate's resume. Extract and structure technical questions based on the projects listed. If no projects are mentioned, ask general experience-based questions.

Return ONLY a JSON object with this exact structure:

{
  "questions": [
    {
      "category": "project-name|general-experience|technical-foundations",
      "question": "The question text"
    }
  ]
}

Resume:
${resumeText.text}
`;
        const interaction = await ai.interactions.create({
            model: "gemini-3.6-flash",
            input: prompt
        });

        const responseText = response.text.replace(/```json/gi, "").replace(/```/g, "").trim();
        const result = JSON.parse(responseText);
        return res.json(result);

    } catch (err) {
        console.error("Error in /questionsFromProject:", err);
        return res.status(500).json({
            error: err.message || "Failed to generate project questions."
        });
    }
});

router.post('/jobCompatibility', upload.single("resume"), async (req, res) => {
    try {
        const resumeFile = req.file;
        if (!resumeFile) {
            return res.status(400).json({ error: "Please upload a resume file." });
        }

        const { jobDescription } = req.body;
        if (!jobDescription || !jobDescription.trim()) {
            return res.status(400).json({ error: "Please enter a job description." });
        }

        const parser = new PDFParse({
            data: resumeFile.buffer
        });
        const resumeText = await parser.getText();
        await parser.destroy();

        const prompt = `
You are an expert ATS (Applicant Tracking System) and technical recruiter.

Your task is to compare the candidate's resume with the given job description and calculate how well the resume matches the job requirements.

Evaluate the match based on:
- Required technical skills
- Programming languages
- Frameworks and libraries
- Tools and technologies
- Projects and practical experience
- Education (if relevant)
- Experience level (if mentioned)
- Overall relevance to the job description

Return ONLY a valid JSON object with this exact structure and nothing else.

{
  "matchPercentage": 85
}

Rules:
- The value must be an integer between 0 and 100.
- Do not include "%" symbol.
- Do not include explanations, reasoning, markdown, code blocks, or additional keys.
- Output ONLY the JSON object.

Resume:
${resumeText.text}

Job Description:
${jobDescription}
`;
        console.log("Prompt", prompt);
        const interaction = await ai.interactions.create({
            model: "gemini-3.6-flash",
            input: prompt
        });
        const response = interaction.output_text;
        console.log("response", response);
        const result = JSON.parse(response);
        console.log("Result", result);
        return res.json(result);

    } catch (err) {
        console.error("Error in /jobCompatibility:", err);
        return res.status(500).json({
            error: err.message || "Failed to analyze job compatibility."
        });
    }
});

router.post('/extract-text', upload.single("resume"), async (req, res) => {
    try {
        const resumeFile = req.file;
        if (!resumeFile) {
            return res.status(400).json({ error: "No resume file provided." });
        }

        const parser = new PDFParse({
            data: resumeFile.buffer
        });
        const parsedResult = await parser.getText();
        await parser.destroy();

        return res.json({
            success: true,
            text: parsedResult.text || ""
        });

    } catch (err) {
        console.error("Error in /extract-text:", err);
        return res.status(500).json({
            error: err.message || "Failed to extract text from resume."
        });
    }
});

module.exports = router;