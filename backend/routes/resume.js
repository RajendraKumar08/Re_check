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

    const resumeFile = req.file;


    const parser = new PDFParse({
        data: resumeFile.buffer
    })

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
})

module.exports = router;