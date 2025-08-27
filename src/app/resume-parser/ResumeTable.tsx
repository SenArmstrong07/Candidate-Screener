import { Fragment } from "react";
import type { Resume } from "lib/redux/types";
import { initialEducation, initialWorkExperience } from "lib/redux/resumeSlice";
import { deepClone } from "lib/deep-clone";
import { cx } from "lib/cx";

const TableRowHeader = ({ children }: { children: React.ReactNode }) => (
  <tr className="divide-x bg-gray-50">
    <th className="px-3 py-2 font-semibold" scope="colgroup" colSpan={2}>
      {children}
    </th>
  </tr>
);

const TableRow = ({
  label,
  value,
  fieldKey,
  onFieldChange,
  className,
}: {
  label: string;
  value: string | string[];
  fieldKey: string;
  onFieldChange?: (field: string, value: string) => void;
  className?: string | false;
}) => (
  <tr className={cx("divide-x", className)}>
    <th className="px-3 py-2 font-medium" scope="row">
      {label}
    </th>
    <td className="w-full px-3 py-2">
      {typeof value === "string" ? (
        onFieldChange ? (
          <input
            type="text"
            value={value}
            onChange={(e) => onFieldChange(fieldKey, e.target.value)}
            className="border px-2 py-1 rounded w-full"
          />
        ) : (
          value
        )
      ) : onFieldChange ? (
        <textarea
          value={value.join("\n")}
          onChange={(e) => onFieldChange(fieldKey, e.target.value)}
          className="border px-2 py-1 rounded w-full"
          rows={Math.max(2, value.length)}
        />
      ) : (
        value.map((x, idx) => (
          <Fragment key={idx}>
            • {x}
            <br />
          </Fragment>
        ))
      )}
    </td>
  </tr>
);

export const ResumeTable = ({
  resume,
  onFieldChange,
}: {
  resume: Resume;
  onFieldChange?: (field: string, value: string) => void;
}) => {
  const educations =
    resume.educations.length === 0
      ? [deepClone(initialEducation)]
      : resume.educations;
  const workExperiences =
    resume.workExperiences.length === 0
      ? [deepClone(initialWorkExperience)]
      : resume.workExperiences;
  const skills = [...resume.skills.descriptions];
  const featuredSkills = resume.skills.featuredSkills
    .filter((item) => item.skill.trim())
    .map((item) => item.skill)
    .join(", ")
    .trim();
  if (featuredSkills) {
    skills.unshift(featuredSkills);
  }
  return (
    <table className="mt-2 w-full border text-sm text-gray-900">
      <tbody className="divide-y text-left align-top">
        <TableRowHeader>Profile</TableRowHeader>
        <TableRow
          label="Name"
          value={resume.profile.name}
          fieldKey="profile.name"
          onFieldChange={onFieldChange}
        />
        <TableRow
          label="Age"
          value={resume.profile.age || ""}
          fieldKey="profile.age"
          onFieldChange={onFieldChange}
        />
        <TableRow
          label="Gender"
          value={resume.profile.gender || ""}
          fieldKey="profile.gender"
          onFieldChange={onFieldChange}
        />
        <TableRow
          label="Email"
          value={resume.profile.email}
          fieldKey="profile.email"
          onFieldChange={onFieldChange}
        />
        <TableRow
          label="Phone"
          value={resume.profile.phone}
          fieldKey="profile.phone"
          onFieldChange={onFieldChange}
        />
        <TableRow
          label="Location"
          value={resume.profile.location}
          fieldKey="profile.location"
          onFieldChange={onFieldChange}
        />
        <TableRow
          label="Link"
          value={resume.profile.url}
          fieldKey="profile.url"
          onFieldChange={onFieldChange}
        />
        <TableRow
          label="Summary"
          value={resume.profile.summary}
          fieldKey="profile.summary"
          onFieldChange={onFieldChange}
        />
        <TableRowHeader>Education</TableRowHeader>
        {educations.map((education, idx) => (
          <Fragment key={idx}>
            <TableRow
              label="School"
              value={education.school}
              fieldKey={`educations.${idx}.school`}
              onFieldChange={onFieldChange}
            />
            <TableRow
              label="Degree"
              value={education.degree}
              fieldKey={`educations.${idx}.degree`}
              onFieldChange={onFieldChange}
            />
            <TableRow
              label="GPA"
              value={education.gpa}
              fieldKey={`educations.${idx}.gpa`}
              onFieldChange={onFieldChange}
            />
            <TableRow
              label="Date"
              value={education.date}
              fieldKey={`educations.${idx}.date`}
              onFieldChange={onFieldChange}
            />
            <TableRow
              label="Descriptions"
              value={education.descriptions}
              fieldKey={`educations.${idx}.descriptions`}
              onFieldChange={onFieldChange}
              className={
                educations.length - 1 !== 0 &&
                idx !== educations.length - 1 &&
                "!border-b-4"
              }
            />
          </Fragment>
        ))}
        <TableRowHeader>Work Experience</TableRowHeader>
        {workExperiences.map((workExperience, idx) => (
          <Fragment key={idx}>
            <TableRow
              label="Company"
              value={workExperience.company}
              fieldKey={`workExperiences.${idx}.company`}
              onFieldChange={onFieldChange}
            />
            <TableRow
              label="Job Title"
              value={workExperience.jobTitle}
              fieldKey={`workExperiences.${idx}.jobTitle`}
              onFieldChange={onFieldChange}
            />
            <TableRow
              label="Date"
              value={workExperience.date}
              fieldKey={`workExperiences.${idx}.date`}
              onFieldChange={onFieldChange}
            />
            <TableRow
              label="Descriptions"
              value={workExperience.descriptions}
              fieldKey={`workExperiences.${idx}.descriptions`}
              onFieldChange={onFieldChange}
              className={
                workExperiences.length - 1 !== 0 &&
                idx !== workExperiences.length - 1 &&
                "!border-b-4"
              }
            />
          </Fragment>
        ))}
        {resume.projects.length > 0 && (
          <TableRowHeader>Projects</TableRowHeader>
        )}
        {resume.projects.map((project, idx) => (
          <Fragment key={idx}>
            <TableRow
              label="Project"
              value={project.project}
              fieldKey={`projects.${idx}.project`}
              onFieldChange={onFieldChange}
            />
            <TableRow
              label="Date"
              value={project.date}
              fieldKey={`projects.${idx}.date`}
              onFieldChange={onFieldChange}
            />
            <TableRow
              label="Descriptions"
              value={project.descriptions}
              fieldKey={`projects.${idx}.descriptions`}
              onFieldChange={onFieldChange}
              className={
                resume.projects.length - 1 !== 0 &&
                idx !== resume.projects.length - 1 &&
                "!border-b-4"
              }
            />
          </Fragment>
        ))}
        <TableRowHeader>Skills</TableRowHeader>
        <TableRow
          label="Descriptions"
          value={skills}
          fieldKey="skills.descriptions"
          onFieldChange={onFieldChange}
        />
      </tbody>
    </table>
  );
};
