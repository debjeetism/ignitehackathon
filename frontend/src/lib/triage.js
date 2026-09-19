const OWNER_DIRECTORY = {
  incident: { name: 'Dr. Ananya Rao', role: 'Incident commander', email: 'ananya.rao@mock-ignite.test', phone: '919810000101' },
  supplier: { name: 'Vikram Malhotra', role: 'Supplier assurance lead', email: 'vikram.malhotra@mock-ignite.test', phone: '919810000102' },
  operations: { name: 'Meera Kapoor', role: 'Kitchen operations lead', email: 'meera.kapoor@mock-ignite.test', phone: '919810000103' },
  communications: { name: 'Rohan Batra', role: 'Public communications lead', email: 'rohan.batra@mock-ignite.test', phone: '919810000104' },
}

function createDraft(owner, subject, body) {
  return {
    owner,
    subject,
    body,
    mailto: `mailto:${owner.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
    whatsapp: `https://wa.me/${owner.phone}?text=${encodeURIComponent(body)}`,
  }
}

export function buildTriagePlan(analysis) {
  const radius = analysis?.blast_radius || {}
  const batch = radius.tainted_batch_id || 'the flagged batch'
  const kitchens = radius.affected_kitchens || []
  const dishes = radius.disabled_dishes || []
  const kitchenList = kitchens.join(', ') || 'all receiving kitchens'
  const dishList = dishes.join(', ') || 'confirmed affected dishes'
  const incident = analysis?.incident_id || 'incident-local'

  return [
    createDraft(OWNER_DIRECTORY.incident, `Incident ${incident}: command review`, `Incident ${incident} requires command review. Contaminated batch: ${batch}. Affected kitchens: ${kitchenList}. Confirm containment owner and next review time.`),
    createDraft(OWNER_DIRECTORY.supplier, `Urgent supplier hold: ${batch}`, `Please place a simulated supplier hold on ${batch}, preserve receiving records, and return certificates of analysis. Incident: ${incident}. Supplier response owner: Vikram Malhotra.`),
    createDraft(OWNER_DIRECTORY.operations, `Kitchen quarantine: ${batch}`, `Quarantine ${batch} at: ${kitchenList}. Confirm inventory isolation, surface sanitation, and manager acknowledgement. Confirmed dishes for removal: ${dishList}.`),
    createDraft(OWNER_DIRECTORY.communications, `Draft recall notice: ${batch}`, `Prepare the internal and consumer-facing recall drafts for ${batch}. Confirmed dishes: ${dishList}. Affected kitchens: ${kitchenList}. Do not describe unlinked kitchen dishes as confirmed contamination.`),
  ]
}

export function getOwnerDirectory() {
  return Object.values(OWNER_DIRECTORY)
}
