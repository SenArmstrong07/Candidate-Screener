"use client";
import { useState, useEffect } from "react";
import { readPdf } from "lib/parse-resume-from-pdf/read-pdf";
import type { TextItems } from "lib/parse-resume-from-pdf/types";
import { groupTextItemsIntoLines } from "lib/parse-resume-from-pdf/group-text-items-into-lines";
import { groupLinesIntoSections } from "lib/parse-resume-from-pdf/group-lines-into-sections";
import { extractResumeFromSections } from "lib/parse-resume-from-pdf/extract-resume-from-sections";
import { ResumeDropzone } from "components/ResumeDropzone";
import { cx } from "lib/cx";
import { Heading, Link, Paragraph } from "components/documentation";
import { ResumeTable } from "resume-parser/ResumeTable";
import { FlexboxSpacer } from "components/FlexboxSpacer";
import { analyzeResumeWithGemini } from "lib/ai/geminiConn";
import { generateResumeAnalysisPrompt } from "lib/ai/genAnalysis";
import { JOB_ROLES } from "data/jobRoles";

// Utility to trigger JSON download
function exportJSON(data: any, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Helper to sanitize applicant name for filenames
function getApplicantName(resume: any) {
  const name = resume?.profile?.name || "applicant";
  return name.replace(/[^a-zA-Z0-9-_]/g, "_");
}

const RESUME_EXAMPLES = [
  {
    fileUrl: "resume-example/laverne-resume.pdf",
    description: (
      <span>
        Borrowed from University of La Verne Career Center -{" "}
        <Link href="https://laverne.edu/careers/wp-content/uploads/sites/15/2010/12/Undergraduate-Student-Resume-Examples.pdf">
          Link
        </Link>
      </span>
    ),
  },
  {
    fileUrl: "resume-example/openresume-resume.pdf",
    description: (
      <span>
        Created with OpenResume resume builder -{" "}
        <Link href="/resume-builder">Link</Link>
      </span>
    ),
  },
];

const defaultFileUrl = RESUME_EXAMPLES[1]["fileUrl"];
export default function ResumeParser() {
  const [fileUrl, setFileUrl] = useState(defaultFileUrl);
  const [textItems, setTextItems] = useState<TextItems>([]);
  const lines = groupTextItemsIntoLines(textItems || []);
  const sections = groupLinesIntoSections(lines);
  const resume = extractResumeFromSections(sections);
  const [analysisResult, setAnalysisResult] = useState<string>("");
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState<string>("Software Development and Engineering");
  const [selectedJobRole, setSelectedJobRole] = useState<string>("");
  const [editableResume, setEditableResume] = useState(resume);
  const [customJobDescription, setCustomJobDescription] = useState("");

  const jobDescription =
    selectedCategory && selectedJobRole
      ? JOB_ROLES[selectedCategory][selectedJobRole]?.description
      : "";

  const requiredSkills =
    selectedCategory && selectedJobRole
      ? JOB_ROLES[selectedCategory][selectedJobRole]?.required_skills
      : [];

  useEffect(() => {
    async function test() {
      const textItems = await readPdf(fileUrl);
      setTextItems(textItems);
    }
    test();
  }, [fileUrl]);

  function setValueByPath(obj: any, path: string, value: string) {
    const keys = path.split(".");
    let curr = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      // Handle array indices
      if (keys[i].includes("[")) {
        const [arrKey, idx] = keys[i].split(/[\[\]]/).filter(Boolean);
        curr = curr[arrKey][parseInt(idx)];
      } else if (keys[i].includes(":")) {
        // Support dot+colon (e.g., educations.0.school)
        const [arrKey, idx] = keys[i].split(":");
        curr = curr[arrKey][parseInt(idx)];
      } else if (!isNaN(Number(keys[i]))) {
        curr = curr[parseInt(keys[i])];
      } else {
        curr = curr[keys[i]];
      }
    }
    // For array fields (like descriptions), split by newline
    if (Array.isArray(curr[keys[keys.length - 1]])) {
      curr[keys[keys.length - 1]] = value.split("\n");
    } else {
      curr[keys[keys.length - 1]] = value;
    }
  }

  //Make ResumeTables editable
  useEffect(() => {
    async function loadResume() {
      const textItems = await readPdf(fileUrl);
      setTextItems(textItems);

      // Parse resume after textItems are loaded
      const lines = groupTextItemsIntoLines(textItems || []);
      const sections = groupLinesIntoSections(lines);
      const parsedResume = extractResumeFromSections(sections);
      setEditableResume(parsedResume);
    }
    loadResume();
  }, [fileUrl]);

  const handleFieldChange = (field: string, value: string) => {
    setEditableResume(prev => {
      const updated = JSON.parse(JSON.stringify(prev));
      setValueByPath(updated, field, value);
      return updated;
    });
  };

  //Analysis Parser
  function parseAnalysisSections(analysis: string) {
    // Split by section headers (## ...)
    const sections = analysis.split(/^##\s+/gm).filter(Boolean);
    const result: Record<string, string> = {};
    sections.forEach(section => {
      const lines = section.split("\n");
      const header = lines[0].trim();
      const content = lines.slice(1).join("\n").trim();
      result[header] = content;
    });
    return result;
  }

  //Customizable Job descriptions
  useEffect(() => {
    if (selectedCategory && selectedJobRole) {
      const desc = JOB_ROLES[selectedCategory][selectedJobRole]?.description || "";
      setCustomJobDescription(desc);
    } else {
      setCustomJobDescription("");
    }
  }, [selectedCategory, selectedJobRole]);

  const renderAnalysisSections = (analysis: string) => {
    if (!analysis) return null;
    // Split by section headers
    const sections = analysis.split(/^##\s+/gm).filter(Boolean);
    return (
      <div className="grid gap-4">
        {sections.map((section, idx) => {
          // First line is the header, rest is content
          const lines = section.split("\n");
          const header = lines[0].trim();
          const content = lines.slice(1).join("\n").trim();

          // Find score in section (e.g., "Resume Score: XX/100")
          const scoreMatch = content.match(/Resume Score:\s*(\d{1,3})\/100/i);
          const score = scoreMatch ? scoreMatch[1] : null;

          return (
            <div key={idx} className="bg-white shadow rounded p-4 border">
              <h3 className="font-semibold text-lg mb-2">{header}</h3>
              <div className="whitespace-pre-wrap mb-2">{content}</div>
              {score && (
                <div className="mt-2 text-right">
                  <span className="inline-block px-3 py-1 rounded bg-blue-100 text-blue-800 font-bold text-xl">
                    Score: {score}/100
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  //Use customJobDesc for analysis
  const handleAnalyzeResume = async () => {
    setLoadingAnalysis(true);
    const prompt = generateResumeAnalysisPrompt(resume, selectedJobRole, customJobDescription);
    const result = await analyzeResumeWithGemini(prompt);
    setAnalysisResult(result);
    setLoadingAnalysis(false);
  };

  return (
    <main className="h-full w-full overflow-hidden">
      <div className="grid md:grid-cols-6">
        <div className="flex justify-center px-2 md:col-span-3 md:h-[calc(100vh-var(--top-nav-bar-height))] md:justify-end">
          <section className="mt-5 grow px-4 md:max-w-[600px] md:px-0">
            <div className="aspect-h-[9.5] aspect-w-7">
              <iframe src={`${fileUrl}#navpanes=0`} className="h-full w-full" />
            </div>
          </section>
          <FlexboxSpacer maxWidth={45} className="hidden md:block" />
        </div>
        <div className="flex px-6 text-gray-900 md:col-span-3 md:h-[calc(100vh-var(--top-nav-bar-height))] md:overflow-y-scroll">
          <FlexboxSpacer maxWidth={45} className="hidden md:block" />
          <section className="max-w-[600px] grow">
            <div className="mt-3">
              <ResumeDropzone
                onFileUrlChange={(fileUrl) =>
                  setFileUrl(fileUrl || defaultFileUrl)
                }
                playgroundView={true}
              />
            </div>
            <Heading level={2} className="!mt-[1.2em]">
              Resume Parsing Results
            </Heading>
            <ResumeTable resume={editableResume} onFieldChange={handleFieldChange} />
            <div className="flex gap-4 mt-4">
              <button
                onClick={() => exportJSON(
                  editableResume,
                  `${getApplicantName(editableResume)}_resume-parsed.json`
                )}
                className="bg-green-600 text-white px-4 py-2 rounded"
              >
                Export Resume JSON
              </button>
            </div>
            <div className="pt-24" />
            <div className="mt-8">
              <h2 className="font-bold text-lg mb-2">Resume Analysis</h2>
              <div className="mb-4">
                <label className="mr-2">Select Job Category:</label>
                <select
                  value={selectedCategory}
                  onChange={e => {
                    setSelectedCategory(e.target.value)
                    setSelectedJobRole(""); //Reset when cat changes
                  }}
                  className="border rounded px-2 py-1"
                >
                  {Object.keys(JOB_ROLES).map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
                {/* Move Select Position to a new line below */}
                <div className="mt-2">
                  <label className="mr-2">Select Position:</label>
                  <select
                    value={selectedJobRole}
                    onChange={e => setSelectedJobRole(e.target.value)}
                    className="border rounded px-2 py-1"
                  >
                    <option value="">None</option>
                    {selectedCategory &&
                      Object.keys(JOB_ROLES[selectedCategory]).map(role => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                  </select>
                </div>
              </div>
              {/* Job Description Editor */}
              {selectedCategory && selectedJobRole && (
                <div className="mb-4">
                  <label className="font-semibold mb-1 block">Job Description:</label>
                  <textarea
                    value={customJobDescription}
                    onChange={e => setCustomJobDescription(e.target.value)}
                    rows={4}
                    className="border rounded px-2 py-1 w-full"
                  />
                </div>
              )}
              <button
                onClick={handleAnalyzeResume}
                disabled={loadingAnalysis}
                className="bg-blue-600 text-white px-4 py-2 rounded"
              >
                {loadingAnalysis ? "Analyzing..." : "Analyze Resume"}
              </button>
              {analysisResult && (
                <div className="mt-6">
                  {renderAnalysisSections(analysisResult)}
                  <div className="flex gap-4 mt-6">
                    <button
                      onClick={() => {
                        const structuredAnalysis = parseAnalysisSections(analysisResult);
                        exportJSON(
                          {
                            applicant: getApplicantName(editableResume),
                            analysis: structuredAnalysis,
                            resume: editableResume
                          },
                          `${getApplicantName(editableResume)}_resume-analysis.json`
                        );
                      }}
                      className="bg-purple-600 text-white px-4 py-2 rounded"
                    >
                      Export Analysis JSON
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
