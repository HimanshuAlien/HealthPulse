const mongoose = require("mongoose");
require("dotenv").config();

// Connect DB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB Connected"))
    .catch(err => console.log(err));

// Schema
const doctorSchema = new mongoose.Schema({
    name: String,
    specialization: String,
    phone: String,
    hospital: String
});

const Doctor = mongoose.model("Doctor", doctorSchema);

// DATA
const doctors = [
    { name: "Dr. Sonu Acharya", specialization: "Pediatric Dentist", phone: "+91 9937793095", hospital: "My Dentist / Pediadent Clinic" },
    { name: "Dr. Arpita Dash", specialization: "Dentist", phone: "Clinic Contact", hospital: "Your Dentist, Saheed Nagar" },
    { name: "Dr. Shashirekha Amit Jena", specialization: "Dentist", phone: "Clinic Contact", hospital: "Private Clinic" },
    { name: "Dr. Nalini Kant Mahapatra", specialization: "Dentist", phone: "Clinic Contact", hospital: "Private Clinic" },
    { name: "Dr. Jibesh Patra", specialization: "Dentist", phone: "Dentex Dental Care", hospital: "Dentex Dental Care" },
    { name: "Dr. Abhaya Chandra Das", specialization: "Dentist", phone: "Clinic Contact", hospital: "Private Clinic" },
    { name: "Dr. Dibya Lochan Swain", specialization: "Dentist", phone: "Clinic Contact", hospital: "Private Clinic" },
    { name: "Dr. Ananya Nayak", specialization: "Dentist", phone: "Clinic Contact", hospital: "Private Clinic" },
    { name: "Dr. Abhishek Ranjan Pati", specialization: "Dentist", phone: "Clinic Contact", hospital: "Private Clinic" },
    { name: "Dr. SK Sahoo", specialization: "Pediatric Dentist", phone: "Ultra Care Clinic", hospital: "Ultra Care Multispeciality Dental Clinic" },

    { name: "Dr. Subhranshu Sekhar Dhal", specialization: "Pediatrician", phone: "Ankura Hospital", hospital: "Ankura Hospital For Women & Children" },
    { name: "Dr. Timir Baran Sahu", specialization: "Pediatrician", phone: "Apollo Hospitals", hospital: "Apollo Hospitals Bhubaneswar" },
    { name: "Dr. Antaryami Nanda", specialization: "Pediatrician", phone: "Apollo Hospitals", hospital: "Apollo Hospitals Bhubaneswar" },
    { name: "Dr. Ranjit Kumar Joshi", specialization: "Pediatrician", phone: "Apollo Hospitals", hospital: "Apollo Hospitals Bhubaneswar" },
    { name: "Dr. Kanhu Panda", specialization: "Pediatrician", phone: "Rahat Hospital", hospital: "Rahat Hospital Centre" },
    { name: "Dr. Bineet Panigrahi", specialization: "Pediatrician", phone: "Mom & Me Clinic", hospital: "Mom and Me Clinic" },
    { name: "Dr. Suryakanta Baraha", specialization: "Pediatrician", phone: "Salvi Clinic", hospital: "Salvi Childcare Clinic" },
    { name: "Dr. Tapas Mohapatra", specialization: "Pediatrician", phone: "JSS Hospital", hospital: "Jagannath Seva Sadan" },
    { name: "Dr. B K Bhuyan", specialization: "Pediatrician", phone: "Excela Clinic", hospital: "Excela Clinic" },
    { name: "Dr. Debasis Panigrahi", specialization: "Pediatrician", phone: "Braintree Center", hospital: "Braintree Child Neuro Center" },

    { name: "Dr. Aniruddh Dash", specialization: "Orthopedic", phone: "MaxKnee Clinic", hospital: "MaxKnee Clinic" },
    { name: "Dr. Sunil Kumar Dash", specialization: "Orthopedic", phone: "AMRI Hospital", hospital: "AMRI Hospitals" },
    { name: "Dr. Niranjan Kar", specialization: "Orthopedic", phone: "Dr Kar Clinic", hospital: "Dr Kar’s Excellence Clinic" },
    { name: "Dr. Dibya Singha Das", specialization: "Orthopedic", phone: "Ortho One Clinic", hospital: "Ortho One Clinic" },
    { name: "Dr. Ravi Sankar Katragadda", specialization: "Orthopedic", phone: "Shree Hospital", hospital: "Shree Hospital" },
    { name: "Dr. Debasish Mishra", specialization: "Orthopedic", phone: "Clinic Contact", hospital: "Private Clinic" },
    { name: "Dr. Smarajit Patnaik", specialization: "Orthopedic", phone: "Clinic Contact", hospital: "Private Clinic" },
    { name: "Dr. Sasmita Devi Agrawal", specialization: "Orthopedic", phone: "Clinic Contact", hospital: "Private Clinic" },
    { name: "Dr. Bibhudatta Sahoo", specialization: "Pediatric Orthopedic", phone: "Ankura Hospital", hospital: "Ankura Hospital" },
    { name: "Dr. Kanhu Panda", specialization: "Pediatric Ortho", phone: "Clinic Contact", hospital: "Multiple Clinics" },

    { name: "Dr. Anupam Jena", specialization: "Cardiologist", phone: "KIMS", hospital: "KIMS Hospital" },
    { name: "Dr. Kahnu Charan Mishra", specialization: "Cardiologist", phone: "Adithya Care", hospital: "Adithya Care Hospital" },
    { name: "Dr. Shishu Shankar Mishra", specialization: "Cardiologist", phone: "Med N Heart", hospital: "Med N Heart Clinic" },
    { name: "Dr. Anil Kumar Nayak", specialization: "General Physician", phone: "Private Clinic", hospital: "Balianta Clinic" },

    { name: "Dr. Ojashwin Mishra", specialization: "General Physician", phone: "SUM Hospital", hospital: "SUM Hospital" },
    { name: "Dr. Bisweswar Das", specialization: "General Physician", phone: "SUM Hospital", hospital: "SUM Hospital" },
    { name: "Dr. Tanushree Sandipta Rath", specialization: "Gynecologist", phone: "SUM Hospital", hospital: "SUM Hospital" },

    { name: "Dr. Manoj Kishor Chhotray", specialization: "General Physician", phone: "Apollo Hospitals", hospital: "Apollo Hospitals" },
    { name: "Dr. Amitav Mohanty", specialization: "General Physician", phone: "Apollo / Manipal", hospital: "Apollo / Manipal" },
    { name: "Dr. Kartick Chandra Jena", specialization: "General Physician", phone: "Apollo Hospitals", hospital: "Apollo Hospitals" },
    { name: "Dr. Ambika Prasad Dash", specialization: "General Physician", phone: "Apollo Hospitals", hospital: "Apollo Hospitals" },
    { name: "Dr. Chinmaya Kumar Pani", specialization: "General Physician", phone: "Private / Vivekanand", hospital: "Vivekanand Hospital" },
    { name: "Dr. Salil Kumar Parida", specialization: "General Physician", phone: "Apollo Hospitals", hospital: "Apollo Hospitals" },
    { name: "Dr. Nachiketa Mohapatra", specialization: "General Physician", phone: "Apollo Hospitals", hospital: "Apollo Hospitals" },
    { name: "Dr. Bikash Agrawala", specialization: "General Physician", phone: "Apollo Hospitals", hospital: "Apollo Hospitals" },
    { name: "Dr. Jyoti Prakash Acharya", specialization: "General Physician", phone: "Health Village", hospital: "Health Village Hospital" },

    { name: "Dr. Ritesh Acharya", specialization: "Interventional Cardiologist", phone: "KIMS Hospital", hospital: "KIMS" },
    { name: "Dr. Kumar Gaurav Behera", specialization: "Cardiologist", phone: "SUM Hospital", hospital: "SUM Hospital" },
    { name: "Dr. Soumya Ranjan Mahapatra", specialization: "Cardiologist", phone: "SUM Hospital", hospital: "SUM Hospital" },
    { name: "Dr. Saumyashree Sagar Nayak", specialization: "Cardiologist", phone: "Private Clinic", hospital: "Dr Dipty Clinic" },

    { name: "Dr. Byomakesh Dikshit", specialization: "Cardiologist", phone: "Apollo Hospitals", hospital: "Apollo Hospitals Bhubaneswar" },
    { name: "Dr. Prasant Kumar Sahoo", specialization: "Cardiologist", phone: "Apollo / Manipal", hospital: "Apollo / Manipal Hospitals" },
    { name: "Dr. Mahesh Prasad Agrawala", specialization: "Cardiologist", phone: "Manipal Hospitals", hospital: "Manipal Hospitals" },
    { name: "Dr. Pradeep Kumar Dash", specialization: "Cardiologist", phone: "Manipal Hospitals", hospital: "Manipal Hospitals" },
    { name: "Dr. Dibya Behera", specialization: "Cardiologist", phone: "Manipal Hospitals", hospital: "Manipal Hospitals" },
    { name: "Dr. P C Rath", specialization: "Cardiologist", phone: "Apollo Hospitals", hospital: "Apollo Hospitals" },
    { name: "Dr. Brajaraj Das", specialization: "Cardiologist", phone: "Apollo Hospitals", hospital: "Apollo Hospitals" },
    { name: "Dr. Jajati Keshari Padhi", specialization: "Cardiologist", phone: "Manipal Hospitals", hospital: "Manipal Hospitals" },
    { name: "Dr. Lingaraj Nath", specialization: "Cardiologist", phone: "Manipal Hospitals", hospital: "Manipal Hospitals" },
    { name: "Dr. Susanta Pradhan", specialization: "Cardiologist", phone: "Sunshine Hospital", hospital: "Sunshine Hospital" }
];

// Insert
async function seedData() {
    await Doctor.deleteMany();
    await Doctor.insertMany(doctors);
    console.log("✅ Doctors seeded successfully");
    process.exit();
}

seedData();