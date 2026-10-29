import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

interface DocumentItem {
  id: string;
  title: string;
  category: 'Warranty' | 'Regulatory' | 'Engineering' | 'Financial';
  issuer: string;
  referenceNumber: string;
  issueDate: string;
  validUntil?: string;
  fileSize: string;
  summary: string;
}

export const DocumentsPage: React.FC = () => {
  const { currentUser } = useApp();
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);

  const documents: DocumentItem[] = [
    {
      id: 'doc_handover',
      title: 'Solar Plant Commissioning & Handover Dossier',
      category: 'Engineering',
      issuer: 'Dheera Green Infra Private Limited',
      referenceNumber: 'DHI-DOSSIER-2026-VK418',
      issueDate: '14 Jan 2026',
      fileSize: '4.2 MB PDF',
      summary: 'Complete engineering handover documentation including pre-commissioning Megger test records, Voc/Isc string logs, elevated pergola structural compliance certificate, and as-built drawings.'
    },
    {
      id: 'doc_module_warranty',
      title: 'Waaree 25-Year Linear Power Warranty Certificate',
      category: 'Warranty',
      issuer: 'Waaree Energies Limited',
      referenceNumber: 'WR-BIF-2026-09142',
      issueDate: '10 Jan 2026',
      validUntil: '09 Jan 2051',
      fileSize: '1.8 MB PDF',
      summary: 'Official OEM manufacturer warranty certifying 12 Waaree 570Wp TOPCon Bifacial modules with 98% Year-1 yield and linear retention retaining at least 84.8% nominal output at Year 25.'
    },
    {
      id: 'doc_inverter_warranty',
      title: 'SMA 10-Year Inverter Manufacturer Guarantee',
      category: 'Warranty',
      issuer: 'SMA Solar Technology AG',
      referenceNumber: 'SMA-STP6.0-40-IN8821',
      issueDate: '12 Jan 2026',
      validUntil: '11 Jan 2036',
      fileSize: '1.2 MB PDF',
      summary: 'Factory warranty card for SMA Sunny Tripower 6.0 kW grid-tied inverter covering hardware replacements, firmware updates, integrated AFCI arc fault detection, and MPPT hardware coverage.'
    },
    {
      id: 'doc_workmanship',
      title: 'Dheera Green 5-Year Workmanship & Free O&M Policy',
      category: 'Warranty',
      issuer: 'Dheera Green Infra Private Limited',
      referenceNumber: 'DHI-WRNT-2026-5Y',
      issueDate: '14 Jan 2026',
      validUntil: '13 Jan 2031',
      fileSize: '950 KB PDF',
      summary: 'Comprehensive contractor warranty covering all civil waterproofing, DC/AC cabling, mounting structure integrity, bi-annual panel cleaning visits, and priority technical breakdown support.'
    },
    {
      id: 'doc_discom_sanction',
      title: 'BRPL Net-Metering Sanction & Safety Clearance',
      category: 'Regulatory',
      issuer: 'BSES Rajdhani Power Limited (BRPL)',
      referenceNumber: `BRPL/VNM/2026/0418-CA${currentUser.consumerNumber}`,
      issueDate: '08 Jan 2026',
      fileSize: '2.4 MB PDF',
      summary: 'Statutory approval letter under DERC Virtual Net Metering Guidelines 2024 authorizing 6.8 kWp bi-directional grid interconnection on CA #102938475 at 415V three-phase nominal.'
    },
    {
      id: 'doc_cfa_subsidy',
      title: 'PM Surya Ghar Central Financial Assistance Sanction',
      category: 'Financial',
      issuer: 'Ministry of New & Renewable Energy (MNRE)',
      referenceNumber: 'PMSG-DL-2026-99214',
      issueDate: '20 Jan 2026',
      fileSize: '820 KB PDF',
      summary: 'Official Direct Benefit Transfer (DBT) subsidy sanction certificate confirming release of ₹78,000 Central Financial Assistance into the customer account for a residential solar plant.'
    },
    {
      id: 'doc_sld',
      title: 'Single Line Electrical Diagram (SLD) & Earthing Log',
      category: 'Engineering',
      issuer: 'Dheera Green Engineering Division',
      referenceNumber: 'DHI-SLD-VK-0418',
      issueDate: '11 Jan 2026',
      fileSize: '3.1 MB PDF',
      summary: 'Stamped engineering schematic detailing dual chemical earthing pits (1.4 Ω measured), Type II AC/DC surge protection devices, and 4 sq.mm solar cabling layout signed by Chief Installation Engineer.'
    },
    {
      id: 'doc_tax_invoice',
      title: 'Final Turnkey EPC Tax Invoice & Payment Receipt',
      category: 'Financial',
      issuer: 'Dheera Green Infra Private Limited',
      referenceNumber: 'DHI-INV-2026-089',
      issueDate: '15 Jan 2026',
      fileSize: '1.5 MB PDF',
      summary: 'GST-compliant invoice detailing equipment supply, elevated structure fabrication, DISCOM liaisoning fees, net metering charges, and balance payment confirmation receipt.'
    }
  ];

  return (
    <div className="flex flex-col w-full px-4 pb-16 space-y-6 max-w-5xl mx-auto animate-in fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-b border-[#e2f0f9] pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#9af4d8]/60 text-[#00725d] text-[11px] font-semibold mb-1">
            <span className="material-symbols-outlined text-[14px]">folder_special</span>
            <span>Digital Document Vault · 8 Verified Records</span>
          </div>
          <h1 className="font-headline text-2xl sm:text-3xl text-[#002620] tracking-tight font-bold">
            Documents &amp; Warranties
          </h1>
          <p className="text-xs sm:text-sm text-[#404846]">
            Access your installation dossiers, OEM warranty cards, DISCOM net-metering sanctions, and government subsidy orders.
          </p>
        </div>
      </div>

      {/* Document Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {documents.map((doc) => (
          <div 
            key={doc.id}
            className="bg-white p-5 rounded-xl border border-[#e2f0f9] shadow-sm flex flex-col justify-between hover:border-[#006b57]/40 transition-colors"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                  doc.category === 'Warranty'
                    ? 'bg-[#d1fae5] text-[#065f46]'
                    : doc.category === 'Regulatory'
                    ? 'bg-[#ffeed9] text-[#b45309]'
                    : doc.category === 'Engineering'
                    ? 'bg-[#dbeafe] text-[#1e40af]'
                    : 'bg-[#f3e8ff] text-[#6b21a8]'
                }`}>
                  {doc.category}
                </span>
                <span className="text-[11px] text-[#717976] font-mono">{doc.fileSize}</span>
              </div>

              <h2 className="font-headline text-base font-bold text-[#002620] mt-2 leading-snug">
                {doc.title}
              </h2>

              <p className="text-xs text-[#404846] mt-1.5 line-clamp-2 leading-relaxed">
                {doc.summary}
              </p>

              <div className="mt-3 pt-3 border-t border-[#e2f0f9] text-[11px] space-y-1">
                <div className="flex items-center justify-between text-[#717976]">
                  <span>Issuer: <strong className="text-[#002620]">{doc.issuer}</strong></span>
                  <span>Issued: <strong className="text-[#002620]">{doc.issueDate}</strong></span>
                </div>
                <div className="flex items-center justify-between font-mono text-[10px] text-[#717976]">
                  <span>Ref: {doc.referenceNumber}</span>
                  {doc.validUntil && (
                    <span className="text-[#006b57] font-sans font-semibold">Valid to: {doc.validUntil}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#e2f0f9] flex items-center gap-2">
              <button
                onClick={() => setSelectedDoc(doc)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[#f4faff] hover:bg-[#e2f0f9] text-[#006b57] text-xs font-semibold transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">visibility</span>
                <span>View Document</span>
              </button>
              <button
                onClick={() => {
                  alert(`Downloading ${doc.title} (${doc.referenceNumber}) for CA #${currentUser.consumerNumber}. Stored securely in your customer vault.`);
                }}
                className="inline-flex items-center justify-center gap-1 py-2 px-3 rounded-lg bg-white border border-[#c0c8c5]/60 hover:bg-[#f4faff] text-[#002620] text-xs font-semibold transition-colors shadow-sm"
                title="Download verified copy"
              >
                <span className="material-symbols-outlined text-[16px]">download</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Document Preview Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div 
            className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-[#cbd2ca] overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 bg-[#f4faff] border-b border-[#e2f0f9] flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-mono font-bold text-[#006b57] tracking-wider block">
                  {selectedDoc.category} Record · {selectedDoc.referenceNumber}
                </span>
                <h3 className="font-headline text-base font-bold text-[#002620] mt-0.5">
                  {selectedDoc.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedDoc(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#404846] hover:bg-[#e2f0f9] transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Document Content Simulation */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs bg-[#fbfbf9]">
              <div className="p-4 rounded-xl bg-white border border-[#e2f0f9] shadow-sm space-y-3 font-mono">
                <div className="flex justify-between items-center border-b border-[#e2f0f9] pb-3">
                  <div>
                    <span className="text-sm font-bold text-[#002620] font-sans block">{selectedDoc.issuer}</span>
                    <span className="text-[11px] text-[#717976]">Verified Certification &amp; Compliance Authority</span>
                  </div>
                  <span className="material-symbols-outlined text-[#006b57] text-[28px]">verified</span>
                </div>

                <div className="space-y-1.5 text-[11px]">
                  <div><strong>Document Ref:</strong> {selectedDoc.referenceNumber}</div>
                  <div><strong>Beneficiary / Customer:</strong> {currentUser.name} (CA #{currentUser.consumerNumber})</div>
                  <div><strong>Installation Address:</strong> Pocket 2, Sector B, Vasant Kunj, New Delhi 110070</div>
                  <div><strong>Issue Date:</strong> {selectedDoc.issueDate}</div>
                  {selectedDoc.validUntil && (
                    <div><strong>Validity Expiration:</strong> {selectedDoc.validUntil}</div>
                  )}
                </div>

                <div className="p-3 bg-[#f4faff] rounded-lg border border-[#e2f0f9] text-xs font-sans text-[#404846] leading-relaxed">
                  <strong>Executive Summary:</strong>
                  <p className="mt-1">{selectedDoc.summary}</p>
                </div>

                <div className="pt-2 text-[10px] text-[#717976] flex items-center justify-between border-t border-[#e2f0f9]">
                  <span>Digital Cryptographic SHA-256 Hash: e7f9...4c21</span>
                  <span className="text-[#006b57] font-sans font-bold">Tamper-Evident Record Verified</span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-[#f4faff] border-t border-[#e2f0f9] flex items-center justify-between">
              <span className="text-xs text-[#717976]">File Format: {selectedDoc.fileSize}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedDoc(null)}
                  className="px-3.5 py-1.5 rounded-lg border border-[#c0c8c5]/60 hover:bg-white text-xs font-semibold text-[#404846] transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    alert(`Downloading verified copy of ${selectedDoc.title}.`);
                    setSelectedDoc(null);
                  }}
                  className="px-4 py-1.5 rounded-lg bg-[#002620] hover:bg-[#003d34] text-white text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">download</span>
                  <span>Download PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
