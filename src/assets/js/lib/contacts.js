/* Google Contacts export for staff records (CSV in Google's import format). */
import { downloadCsv, toast } from "./ui.js";

const SCHOOL_NAME = "Ilado-Sagbo Community Grammar School";

const CONTACT_CATEGORY_CONFIG = {
  teaching: {
    nameKey:"full_name_of_staff", genderKey:"gender", dobKey:"date_of_birth_dd_mm_yyy",
    emailKey:"email_address", phoneKeys:["gsm_no","gsm_whatsapp_no_only"],
    titleKey:"present_post_prinpal_supervisor_vice_principal_tutor",
    deptKey:"main_subject_taught_consider_degree_cert",
    addressKey:"residential_address", groupLabel:"ISCGS Teaching Staff",
    extraNotes:[
      ["lg_of_origin","LGA of Origin"], ["post_on_first_appointment","Post on First Appointment"],
      ["date_of_first_appointment_dd_mm_yyyy","Date of First Appointment"],
      ["date_of_last_promotion_dd_mm_yyyy","Date of Last Promotion"],
      ["date_of_retirement_dd_mm_yyyy","Date of Retirement"],
      ["date_posted_to_present_school","Date Posted to Present School"],
      ["qualifications_with_dates","Qualifications"],
      ["area_of_specialization_consider_degree_cert","Area of Specialization"],
      ["other_teaching_subject_consider_nce_cert","Other Teaching Subject"],
      ["junior_classes_taught","Junior Classes Taught"], ["senior_classes_taught","Senior Classes Taught"],
      ["total_period_per_week","Periods per Week"], ["grade","Grade"], ["step","Step"],
      ["disability_yes_no","Disability"], ["remark","Remark"]
    ]
  },
  nonTeaching: {
    nameKey:"full_name", genderKey:"gender", dobKey:"date_of_birth",
    emailKey:null, phoneKeys:["gsm_whatsapp_no_only"],
    titleKey:"job_title", deptKey:null,
    addressKey:"home_address", groupLabel:"ISCGS Non-Teaching Staff",
    extraNotes:[
      ["date_of_first_appointment","Date of First Appointment"],
      ["date_of_last_promotion","Date of Last Promotion"],
      ["date_of_retirement","Date of Retirement"],
      ["date_posted_to_present_school","Date Posted to Present School"],
      ["qualifications_with_date","Qualifications"], ["teaching_qualifications","Teaching Qualifications"],
      ["area_of_specialization","Area of Specialization"], ["grade","Grade"], ["step","Step"],
      ["disability_yes_no","Disability"], ["remark","Remark"]
    ]
  },
  corps: {
    nameKey:"full_name", genderKey:"gender", dobKey:"date_of_birth",
    emailKey:null, phoneKeys:["gsm_whatsapp_no_only"],
    titleKey:"classes_taught", deptKey:"teaching_subject_s",
    addressKey:"home_address", groupLabel:"ISCGS Corps Members",
    extraNotes:[
      ["date_of_first_appointment","Date of First Appointment"],
      ["grade","Grade"], ["step","Step"], ["disability_yes_no","Disability"], ["remark","Remark"]
    ]
  }
};

function formatNgPhone(v){
  if(v===null || v===undefined || v==="") return "";
  const digits = String(v).replace(/\D/g,"");
  if(!digits) return "";
  if(digits.length===10) return "0"+digits;
  if(digits.length===13 && digits.startsWith("234")) return "+"+digits;
  return digits;
}

function buildContactRows(list, cfg){
  return (list||[]).map(r => {
    const name = String(r[cfg.nameKey] || "").trim();
    if(!name) return null;
    const parts = name.split(/\s+/);
    const family = parts[0] || "";
    const given = parts.slice(1).join(" ");

    const email = cfg.emailKey ? String(r[cfg.emailKey] || "").trim() : "";
    let phone = "";
    for(const pk of cfg.phoneKeys){ if(r[pk]){ phone = formatNgPhone(r[pk]); break; } }
    const title = cfg.titleKey ? String(r[cfg.titleKey] || "").trim() : "";
    const dept = cfg.deptKey ? String(r[cfg.deptKey] || "").trim() : "";
    const address = cfg.addressKey ? String(r[cfg.addressKey] || "").trim() : "";
    const dobRaw = cfg.dobKey ? String(r[cfg.dobKey] || "") : "";
    const birthday = /^\d{4}-\d{2}-\d{2}$/.test(dobRaw) ? dobRaw : "";

    const notesLines = [];
    (cfg.extraNotes || []).forEach(([k,label]) => {
      const v = r[k];
      if(v !== null && v !== undefined && String(v).trim() !== "") notesLines.push(`${label}: ${v}`);
    });

    return {
      "Name": name, "Given Name": given, "Family Name": family,
      "Birthday": birthday, "Gender": r[cfg.genderKey] || "",
      "E-mail 1 - Type": email ? "Work" : "", "E-mail 1 - Value": email,
      "Phone 1 - Type": phone ? "Mobile" : "", "Phone 1 - Value": phone,
      "Organization 1 - Type": "Work", "Organization 1 - Name": SCHOOL_NAME,
      "Organization 1 - Title": title, "Organization 1 - Department": dept,
      "Address 1 - Type": address ? "Home" : "", "Address 1 - Formatted": address,
      "Notes": notesLines.join("\n"),
      "Group Membership": cfg.groupLabel
    };
  }).filter(Boolean);
}


const HEADERS = ["Name", "Given Name", "Family Name", "Birthday", "Gender",
  "E-mail 1 - Type", "E-mail 1 - Value", "Phone 1 - Type", "Phone 1 - Value",
  "Organization 1 - Type", "Organization 1 - Name", "Organization 1 - Title", "Organization 1 - Department",
  "Address 1 - Type", "Address 1 - Formatted", "Notes", "Group Membership"];

export function exportGoogleContactsCsv(staff) {
  const rows = [
    ...buildContactRows(staff.teaching, CONTACT_CATEGORY_CONFIG.teaching),
    ...buildContactRows(staff.nonTeaching, CONTACT_CATEGORY_CONFIG.nonTeaching),
    ...buildContactRows(staff.corps, CONTACT_CATEGORY_CONFIG.corps)
  ];
  if (!rows.length) { toast("No staff records to export.", { error: true }); return; }
  downloadCsv(rows, "iscgs_staff_google_contacts.csv", HEADERS, { neutralise: false });
  toast(`Exported ${rows.length} staff contact(s), ready to import into Google Contacts.`);
}
