// Our own installation photos, with the alt text and caption each one is published with. Used by the
// installations page and by blog posts, which pick one by name.
import rooftopHouse from '../assets/installations/rooftop-solar-panels-on-house-punjab.jpg';
import pumpChannel from '../assets/installations/solar-pump-water-flowing-into-field-channel.jpg';
import pumpHouseInverter from '../assets/installations/utl-solar-inverter-wall-mounted-pump-house.jpg';
import groundArrayFarm from '../assets/installations/ground-mounted-solar-array-farm-punjab.jpg';
import arrayOverShed from '../assets/installations/solar-array-over-farm-shed-punjab.jpg';
import tubewellDischarge from '../assets/installations/solar-tubewell-pump-water-discharge-punjab.jpg';
import rooftopInProgress from '../assets/installations/rooftop-solar-installation-in-progress-punjab.jpg';
import canopyCommercial from '../assets/installations/solar-panel-canopy-commercial-punjab.jpg';
import groundRows from '../assets/installations/ground-mounted-solar-panel-rows-punjab.jpg';
import onGridInverter from '../assets/installations/utl-solar-on-grid-inverter-installed.jpg';
import rooftopTown from '../assets/installations/rooftop-solar-panels-town-punjab.jpg';
import inverterAndPanel from '../assets/installations/solar-inverter-and-electrical-panel-installed.jpg';
import rooftopHome from '../assets/installations/rooftop-solar-array-home-punjab.jpg';
import arrayCloseUp from '../assets/installations/solar-panel-array-close-up-punjab.jpg';
import mountingStructure from '../assets/installations/rooftop-solar-mounting-structure-punjab.jpg';

export const PHOTOS = [
  { name: 'rooftop-solar-panels-on-house-punjab', src: rooftopHouse, alt: 'Rooftop solar array on a house in Punjab, the panels raised on a steel frame above the roof slab', caption: 'A home array on a raised frame, which leaves the roof usable underneath.' },
  { name: 'solar-pump-water-flowing-into-field-channel', src: pumpChannel, alt: 'Water flowing from a solar pump into a concrete field channel in Punjab', caption: 'A solar pump running into the field channel.' },
  { name: 'utl-solar-inverter-wall-mounted-pump-house', src: pumpHouseInverter, alt: 'UTL Solar inverter mounted on the wall of a pump house, with conduit running out to the array', caption: 'A UTL inverter in a pump house, the DC run coming in from the array.' },
  { name: 'ground-mounted-solar-array-farm-punjab', src: groundArrayFarm, alt: 'Pole-mounted solar array standing in a field in Punjab', caption: 'A pole-mounted array on farmland.' },
  { name: 'solar-array-over-farm-shed-punjab', src: arrayOverShed, alt: 'Solar panels mounted over a farm shed in Punjab with a tractor trailer parked underneath', caption: 'Panels over a shed, so the ground underneath stays in use.' },
  { name: 'solar-tubewell-pump-water-discharge-punjab', src: tubewellDischarge, alt: 'Water discharging from a solar tubewell pump onto a ploughed field in Punjab', caption: 'Discharge from a solar tubewell.' },
  { name: 'rooftop-solar-installation-in-progress-punjab', src: rooftopInProgress, alt: 'Solar panels being fitted on a house roof in Punjab, a ladder against the wall', caption: 'Mid-installation. The structure goes up first, then the modules.' },
  { name: 'solar-panel-canopy-commercial-punjab', src: canopyCommercial, alt: 'Large solar panel canopy covering an open area', caption: 'A canopy array: shade below, generation above.' },
  { name: 'ground-mounted-solar-panel-rows-punjab', src: groundRows, alt: 'Rows of ground-mounted solar panels on farmland in Punjab', caption: 'Ground-mounted rows.' },
  { name: 'utl-solar-on-grid-inverter-installed', src: onGridInverter, alt: 'UTL Solar on-grid inverter installed on an interior wall', caption: 'An on-grid inverter, mounted indoors.' },
  { name: 'rooftop-solar-panels-town-punjab', src: rooftopTown, alt: 'Rooftop solar panels on a building with a town behind them', caption: 'A rooftop array above the rooftops.' },
  { name: 'solar-inverter-and-electrical-panel-installed', src: inverterAndPanel, alt: 'Solar inverter installed beside an electrical distribution box', caption: 'Inverter and distribution board.' },
  { name: 'rooftop-solar-array-home-punjab', src: rooftopHome, alt: 'Solar array across a house rooftop in Punjab', caption: 'A home rooftop, filled.' },
  { name: 'solar-panel-array-close-up-punjab', src: arrayCloseUp, alt: 'Close view along a row of solar panels showing the mounting rails underneath', caption: 'Along the rails.' },
  { name: 'rooftop-solar-mounting-structure-punjab', src: mountingStructure, alt: 'Galvanised mounting structure on a rooftop, ready for solar panels', caption: 'The structure, before the modules go on.' },
];

export const photoByName = (name: string) => PHOTOS.find((p) => p.name === name);
