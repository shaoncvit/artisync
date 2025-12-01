import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { firebase } from "@/lib/firebaseClient";
import { doc, serverTimestamp, setDoc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

type ArtistProfile = {
  // Basic Information
  fullName: string;
  profilePicture: File | null;
  profilePictureUrl: string;
  coverBanner: File | null;
  coverBannerUrl: string;
  area: string; // North, South, East, West
  city: string;
  country: string;
  youtubeVideo: string;
  
  // Contact Details
  phone?: string;
  email: string;
  
  // Social Media Links
  instagram?: string;
  facebook?: string;
  youtube?: string;
  
  // Other fields will be added in subsequent steps
  bio?: string;
  createdAt: any;
  showInstagram: boolean;
  showFacebook: boolean;
  showYouTube: boolean;
};

export default function CreateProfilePage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [form, setForm] = useState<ArtistProfile>({
    fullName: "",
    profilePicture: null,
    profilePictureUrl: "",
    coverBanner: null,
    coverBannerUrl: "",
    area: "",
    city: "",
    country: "India", // Set to India by default
    youtubeVideo: "",
    phone: "",
    email: "",
    instagram: "",
    facebook: "",
    youtube: "",
    bio: "",
    createdAt: null,
    showInstagram: false,
    showFacebook: false,
    showYouTube: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(firebase.auth, async (u) => {
      if (!u) {
        router.replace({ pathname: "/signup", query: { role: "artist" } });
      } else {
        setUserId(u.uid);
        setForm((prev) => ({ ...prev, email: u.email ?? prev.email }));
        
        // Load existing profile data if available
        await loadExistingProfile(u.uid);
      }
    });
    return () => unsub();
  }, [router]);

  async function loadExistingProfile(userId: string) {
    try {
      console.log('Loading existing profile for user:', userId);
      const profileDoc = await getDoc(doc(firebase.db, "artists", userId));
      
      if (profileDoc.exists()) {
        const existingData = profileDoc.data();
        console.log('Existing profile data found:', existingData);
        
        // Update form with existing data
        setForm(prev => ({
          ...prev,
          fullName: existingData.fullName || "",
          profilePictureUrl: existingData.profilePictureUrl || "",
          coverBannerUrl: existingData.coverBannerUrl || "",
          area: existingData.area || "",
          city: existingData.city || "",
          country: existingData.country || "",
          youtubeVideo: existingData.youtubeVideo || "",
          phone: existingData.phone || "",
          email: existingData.email || prev.email,
          instagram: existingData.instagram || "",
          facebook: existingData.facebook || "",
          youtube: existingData.youtube || "",
          bio: existingData.bio || "",
          showInstagram: !!existingData.instagram,
          showFacebook: !!existingData.facebook,
          showYouTube: !!existingData.youtube,
        }));
        
        // Mark profile as already saved
        setProfileSaved(true);
        console.log('Profile loaded successfully, form updated');
      } else {
        console.log('No existing profile found for user:', userId);
      }
    } catch (err: any) {
      console.error('Error loading existing profile:', err);
      // Don't show error to user, just log it
    }
  }

  function update<K extends keyof ArtistProfile>(key: K, value: ArtistProfile[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleFileUpload(file: File, type: 'profile' | 'banner'): Promise<string> {
    if (!file) return '';
    
    const fileExtension = file.name.split('.').pop();
    const fileName = `${userId}_${type}_${Date.now()}.${fileExtension}`;
    const storageRef = ref(firebase.storage, `artists/${userId}/${fileName}`);
    
    try {
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      return downloadURL;
    } catch (error) {
      console.error('Upload failed:', error);
      throw new Error(`Failed to upload ${type} image`);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) {
      console.error('No userId available');
      setError('User not authenticated. Please sign in again.');
      return;
    }
    
    console.log('Starting profile save for userId:', userId);
    console.log('Form data:', form);
    
    setLoading(true);
    setError(null);
    
    try {
      // Upload profile picture if selected
      let profilePictureUrl = form.profilePictureUrl;
      if (form.profilePicture) {
        console.log('Uploading profile picture...');
        setUploading(true);
        profilePictureUrl = await handleFileUpload(form.profilePicture, 'profile');
        console.log('Profile picture uploaded:', profilePictureUrl);
        setUploading(false);
      }

      // Upload cover banner if selected
      let coverBannerUrl = form.coverBannerUrl;
      if (form.coverBanner) {
        console.log('Uploading cover banner...');
        setUploading(true);
        coverBannerUrl = await handleFileUpload(form.coverBanner, 'banner');
        console.log('Cover banner uploaded:', coverBannerUrl);
        setUploading(false);
      }

      // Prepare data for Firestore
      const profileData: any = {
        fullName: form.fullName,
        profilePictureUrl,
        coverBannerUrl,
        area: form.area,
        city: form.city,
        country: form.country,
        youtubeVideo: form.youtubeVideo,
        phone: form.phone,
        email: form.email,
        instagram: form.instagram,
        facebook: form.facebook,
        youtube: form.youtube,
        bio: form.bio,
        updatedAt: serverTimestamp(), // Use updatedAt for edits
        step: 1, // Mark as completed step 1
      };

      // Add createdAt only for new profiles
      if (!profileSaved) {
        profileData.createdAt = serverTimestamp();
      }

      console.log('Saving to Firestore with data:', profileData);
      console.log('Country value being saved:', form.country);
      console.log('Firebase instance:', firebase);
      console.log('Firestore instance:', firebase.db);

      // Save to Firestore (this will create or update)
      await setDoc(doc(firebase.db, "artists", userId), profileData);
      
      console.log('Profile saved successfully to Firestore!');
      setProfileSaved(true);

      // Don't redirect automatically - let user click Preview button
      // router.push('/profile-preview');
      
    } catch (err: any) {
      console.error('Error saving profile:', err);
      console.error('Error details:', {
        message: err?.message,
        code: err?.code,
        stack: err?.stack
      });
      setError(`Failed to save profile: ${err?.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
      setUploading(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>, type: 'profile' | 'banner') {
    const file = e.target.files?.[0];
    if (file) {
      if (type === 'profile') {
        update('profilePicture', file);
      } else {
        update('coverBanner', file);
      }
    }
  }

  // Extract YouTube video ID from URL
  function getYouTubeVideoId(url: string): string | null {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  }

  const videoId = getYouTubeVideoId(form.youtubeVideo);

  const [showYouTube, setShowYouTube] = useState(false);

  // Area options for city areas
  const areaOptions = [
    "North", "South", "East", "West", "Central", "Northeast", "Northwest", 
    "Southeast", "Southwest", "Old City", "New City", "Downtown", "Uptown",
    "Suburb", "Industrial Area", "Residential Area", "Commercial Area"
  ];

  // Indian cities data (all cities in one array)
  const indianCities = [
    "Delhi", "Mumbai", "Pune", "Nagpur", "Thane", "Nashik", "Jaipur", "Jodhpur", "Bikaner", "Udaipur", "Ajmer", "Lucknow", "Kanpur", "Agra", "Varanasi", "Allahabad", "Amroha", "Moradabad", "Aligarh", "Saharanpur", "Noida", "Jhansi", "Shahjahanpur", "Rampur", "Modinagar", "Hapur", "Etawah", "Sambhal", "Orai", "Bahraich", "Unnao", "Rae Bareli", "Lakhimpur", "Sitapur", "Lalitpur", "Pilibhit", "Chandausi", "Hardoi", "Azamgarh", "Khair", "Sultanpur", "Tanda", "Nagina", "Shamli", "Najibabad", "Shikohabad", "Sikandrabad", "Shahabad", "Pilkhuwa", "Renukoot", "Vrindavan", "Ujhani", "Laharpur", "Tilhar", "Sahaswan", "Rath", "Sherkot", "Kalpi", "Tundla", "Sandila", "Nanpara", "Sardhana", "Nehtaur", "Seohara", "Padrauna", "Mathura", "Thakurdwara", "Nawabganj", "Siana", "Noorpur", "Sikandra Rao", "Puranpur", "Rudauli", "Thana Bhawan", "Palia Kalan", "Zaidpur", "Nautanwa", "Zamania", "Shikarpur", "Naugawan Sadat", "Fatehpur Sikri", "Shahabad", "Robertsganj", "Utraula", "Sadabad", "Rasra", "Lar", "Lal Gopalganj Nindaura", "Sirsaganj", "Pihani", "Shamsabad", "Rudrapur", "Soron", "Samdhan", "Sahjanwa", "Rampur Maniharan", "Sumerpur", "Shahganj", "Tulsipur", "Tirwaganj", "PurqUrban Agglomerationzi", "Shamsabad", "Warhapur", "Powayan", "Sandi", "Achhnera", "Naraura", "Nakur", "Sahaspur", "Safipur", "Reoti", "Sikanderpur", "Saidpur", "Sirsi", "Purwa", "Parasi", "Lalganj", "Phulpur", "Shishgarh", "Sahawar", "Samthar", "Pukhrayan", "Obra", "Niwai", "Mirzapur", "Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem", "Tirunelveli", "Tiruppur", "Ranipet", "Nagercoil", "Thanjavur", "Vellore", "Kancheepuram", "Erode", "Tiruvannamalai", "Pollachi", "Rajapalayam", "Sivakasi", "Pudukkottai", "Neyveli", "Nagapattinam", "Viluppuram", "Tiruchengode", "Vaniyambadi", "Theni Allinagaram", "Udhagamandalam", "Aruppukkottai", "Paramakudi", "Arakkonam", "Virudhachalam", "Srivilliputhur", "Tindivanam", "Virudhunagar", "Karur", "Valparai", "Sankarankovil", "Tenkasi", "Palani", "Pattukkottai", "Tirupathur", "Ramanathapuram", "Udumalaipettai", "Gobichettipalayam", "Thiruvarur", "Thiruvallur", "Panruti", "Namakkal", "Thirumangalam", "Vikramasingapuram", "Nellikuppam", "Rasipuram", "Tiruttani", "Nandivaram-Guduvancheri", "Periyakulam", "Pernampattu", "Vellakoil", "Sivaganga", "Vadalur", "Rameshwaram", "Tiruvethipuram", "Perambalur", "Usilampatti", "Vedaranyam", "Sathyamangalam", "Puliyankudi", "Nanjikottai", "Thuraiyur", "Sirkali", "Tiruchendur", "Periyasemur", "Sattur", "Vandavasi", "Tharamangalam", "Tirukkoyilur", "Oddanchatram", "Palladam", "Vadakkuvalliyur", "Tirukalukundram", "Uthamapalayam", "Surandai", "Sankari", "Shenkottai", "Vadipatti", "Sholingur", "Tirupathur", "Manachanallur", "Viswanatham", "Polur", "Panagudi", "Uthiramerur", "Thiruthuraipoondi", "Pallapatti", "Ponneri", "Lalgudi", "Natham", "Unnamalaikadai", "P.N.Patti", "Tharangambadi", "Tittakudi", "Pacode", "O' Valley", "Suriyampalayam", "Sholavandan", "Thammampatti", "Namagiripettai", "Peravurani", "Parangipettai", "Pudupattinam", "Pallikonda", "Sivagiri", "Punjaipugalur", "Padmanabhapuram", "Thirupuvanam", "Bengaluru", "Hubli-Dharwad", "Belagavi", "Mangaluru", "Davanagere", "Ballari", "Mysore", "Tumkur", "Shivamogga", "Raayachuru", "Robertson Pet", "Kolar", "Mandya", "Udupi", "Chikkamagaluru", "Karwar", "Ranebennuru", "Ranibennur", "Ramanagaram", "Gokak", "Yadgir", "Rabkavi Banhatti", "Shahabad", "Sirsi", "Sindhnur", "Tiptur", "Arsikere", "Nanjangud", "Sagara", "Sira", "Puttur", "Athni", "Mulbagal", "Surapura", "Siruguppa", "Mudhol", "Sidlaghatta", "Shahpur", "Saundatti-Yellamma", "Wadi", "Manvi", "Nelamangala", "Lakshmeshwar", "Ramdurg", "Nargund", "Tarikere", "Malavalli", "Savanur", "Lingsugur", "Vijayapura", "Sankeshwara", "Madikeri", "Talikota", "Sedam", "Shikaripur", "Mahalingapura", "Mudalagi", "Muddebihal", "Pavagada", "Malur", "Sindhagi", "Sanduru", "Afzalpur", "Maddur", "Madhugiri", "Tekkalakote", "Terdal", "Mudabidri", "Magadi", "Navalgund", "Shiggaon", "Shrirangapattana", "Sindagi", "Sakaleshapura", "Srinivaspur", "Ron", "Mundargi", "Sadalagi", "Piriyapatna", "Adyar", "Thiruvananthapuram", "Kochi", "Kozhikode", "Kollam", "Thrissur", "Palakkad", "Alappuzha", "Malappuram", "Ponnani", "Vatakara", "Kanhangad", "Taliparamba", "Koyilandy", "Neyyattinkara", "Kayamkulam", "Nedumangad", "Kannur", "Tirur", "Kottayam", "Kasaragod", "Kunnamkulam", "Ottappalam", "Thiruvalla", "Thodupuzha", "Chalakudy", "Changanassery", "Punalur", "Nilambur", "Cherthala", "Perinthalmanna", "Mattannur", "Shoranur", "Varkala", "Paravoor", "Pathanamthitta", "Peringathur", "Attingal", "Kodungallur", "Pappinisseri", "Chittur-Thathamangalam", "Muvattupuzha", "Adoor", "Mavelikkara", "Mavoor", "Perumbavoor", "Vaikom", "Palai", "Panniyannur", "Guruvayoor", "Puthuppally", "Panamattom", "Hyderabad", "Warangal", "Nizamabad", "Karimnagar", "Ramagundam", "Khammam", "Mahbubnagar", "Mancherial", "Adilabad", "Suryapet", "Jagtial", "Miryalaguda", "Nirmal", "Kamareddy", "Kothagudem", "Bodhan", "Palwancha", "Mandamarri", "Koratla", "Sircilla", "Tandur", "Siddipet", "Wanaparthy", "Kagaznagar", "Gadwal", "Sangareddy", "Bellampalle", "Bhongir", "Vikarabad", "Jangaon", "Bhadrachalam", "Bhainsa", "Farooqnagar", "Medak", "Narayanpet", "Sadasivpet", "Yellandu", "Manuguru", "Kyathampalle", "Nagarkurnool", "Kolkata", "Siliguri", "Asansol", "Raghunathganj", "Kharagpur", "Naihati", "English Bazar", "Baharampur", "Hugli-Chinsurah", "Raiganj", "Jalpaiguri", "Santipur", "Balurghat", "Medinipur", "Habra", "Ranaghat", "Bankura", "Nabadwip", "Darjiling", "Purulia", "Arambagh", "Tamluk", "AlipurdUrban Agglomerationr", "Suri", "Jhargram", "Gangarampur", "Rampurhat", "Kalimpong", "Sainthia", "Taki", "Murshidabad", "Memari", "Paschim Punropara", "Tarakeswar", "Sonamukhi", "PandUrban Agglomeration", "Mainaguri", "Malda", "Panchla", "Raghunathpur", "Mathabhanga", "Monoharpur", "Srirampore", "Adra", "Guwahati", "Silchar", "Dibrugarh", "Nagaon", "Tinsukia", "Jorhat", "Bongaigaon City", "Dhubri", "Diphu", "North Lakhimpur", "Tezpur", "Karimganj", "Sibsagar", "Goalpara", "Barpeta", "Lanka", "Lumding", "Mankachar", "Nalbari", "Rangia", "Margherita", "Mangaldoi", "Silapathar", "Mariani", "Marigaon", "Bhubaneswar", "Cuttack", "Raurkela", "Brahmapur", "Sambalpur", "Puri", "Baleshwar Town", "Baripada Town", "Bhadrak", "Balangir", "Jharsuguda", "Bargarh", "Paradip", "Bhawanipatna", "Dhenkanal", "Barbil", "Kendujhar", "Sunabeda", "Rayagada", "Jatani", "Byasanagar", "Kendrapara", "Rajagangapur", "Parlakhemundi", "Talcher", "Sundargarh", "Phulabani", "Pattamundai", "Titlagarh", "Nabarangapur", "Soro", "Malkangiri", "Rairangpur", "Tarbha", "Patna", "Gaya", "Bhagalpur", "Muzaffarpur", "Darbhanga", "Arrah", "Begusarai", "Chhapra", "Katihar", "Munger", "Purnia", "Saharsa", "Sasaram", "Hajipur", "Dehri-on-Sone", "Bettiah", "Motihari", "Bagaha", "Siwan", "Kishanganj", "Jamalpur", "Buxar", "Jehanabad", "Aurangabad", "Lakhisarai", "Nawada", "Jamui", "Sitamarhi", "Araria", "Gopalganj", "Madhubani", "Masaurhi", "Samastipur", "Mokameh", "Supaul", "Dumraon", "Arwal", "Forbesganj", "BhabUrban Agglomeration", "Narkatiaganj", "Naugachhia", "Madhepura", "Sheikhpura", "Sultanganj", "Raxaul Bazar", "Ramnagar", "Mahnar Bazar", "Warisaliganj", "Revelganj", "Rajgir", "Sonepur", "Sherghati", "Sugauli", "Makhdumpur", "Maner", "Rosera", "Nokha", "Piro", "Rafiganj", "Marhaura", "Mirganj", "Lalganj", "Murliganj", "Motipur", "Manihari", "Sheohar", "Maharajganj", "Silao", "Barh", "Asarganj", "Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar", "Jamnagar", "Nadiad", "Porbandar", "Anand", "Morvi", "Mahesana", "Bharuch", "Vapi", "Navsari", "Veraval", "Bhuj", "Godhra", "Palanpur", "Valsad", "Patan", "Deesa", "Amreli", "Anjar", "Dhoraji", "Khambhat", "Mahuva", "Keshod", "Wadhwan", "Ankleshwar", "Savarkundla", "Kadi", "Visnagar", "Upleta", "Una", "Sidhpur", "Unjha", "Mangrol", "Viramgam", "Modasa", "Palitana", "Petlad", "Kapadvanj", "Sihor", "Wankaner", "Limbdi", "Mandvi", "Thangadh", "Vyara", "Padra", "Lunawada", "Rajpipla", "Vapi", "Umreth", "Sanand", "Rajula", "Radhanpur", "Mahemdabad", "Ranavav", "Tharad", "Mansa", "Umbergaon", "Talaja", "Vadnagar", "Manavadar", "Salaya", "Vijapur", "Pardi", "Rapar", "Songadh", "Lathi", "Adalaj", "Chhapra", "Gandhinagar", "Marmagao", "Panaji", "Margao", "Mapusa", "Chandigarh", "Faridabad", "Gurgaon", "Hisar", "Rohtak", "Panipat", "Karnal", "Sonipat", "Yamunanagar", "Panchkula", "Bhiwani", "Bahadurgarh", "Jind", "Sirsa", "Thanesar", "Kaithal", "Palwal", "Rewari", "Hansi", "Narnaul", "Fatehabad", "Gohana", "Tohana", "Narwana", "Mandi Dabwali", "Charkhi Dadri", "Shahbad", "Pehowa", "Samalkha", "Pinjore", "Ladwa", "Sohna", "Safidon", "Taraori", "Mahendragarh", "Ratia", "Rania", "Sarsod", "Ludhiana", "Patiala", "Amritsar", "Jalandhar", "Bathinda", "Pathankot", "Hoshiarpur", "Batala", "Moga", "Malerkotla", "Khanna", "Mohali", "Barnala", "Firozpur", "Phagwara", "Kapurthala", "Zirakpur", "Kot Kapura", "Faridkot", "Muktsar", "Rajpura", "Sangrur", "Fazilka", "Gurdaspur", "Kharar", "Gobindgarh", "Mansa", "Malout", "Nabha", "Tarn Taran", "Jagraon", "Sunam", "Dhuri", "Firozpur Cantt.", "Sirhind Fatehgarh Sahib", "Rupnagar", "Jalandhar Cantt.", "Samana", "Nawanshahr", "Rampura Phul", "Nangal", "Nakodar", "Zira", "Patti", "Raikot", "Longowal", "Urmar Tanda", "Morinda, India", "Phillaur", "Pattran", "Qadian", "Sujanpur", "Mukerian", "Talwara", "Shimla", "Mandi", "Solan", "Nahan", "Sundarnagar", "Palampur", "Kullu", "Manali", "Agartala", "Udaipur", "Dharmanagar", "Pratapgarh", "Kailasahar", "Belonia", "Khowai", "Aizawl", "Lunglei", "Saiha", "Dimapur", "Kohima", "Zunheboto", "Tuensang", "Wokha", "Mokokchung", "Imphal", "Thoubal", "Lilong", "Mayang Imphal", "Naharlagun", "Pasighat", "Port Blair", "Silvassa", "Pondicherry", "Karaikal", "Yanam", "Mahe", "Dehradun", "Hardwar", "Haldwani-cum-Kathgodam", "Srinagar", "Kashipur", "Roorkee", "Rudrapur", "Rishikesh", "Ramnagar", "Pithoragarh", "Manglaur", "Nainital", "Mussoorie", "Tehri", "Pauri", "Nagla", "Sitarganj", "Bageshwar", "Raipur", "Bhilai Nagar", "Korba", "Bilaspur", "Durg", "Rajnandgaon", "Jagdalpur", "Raigarh", "Ambikapur", "Mahasamund", "Dhamtari", "Chirmiri", "Bhatapara", "Dalli-Rajhara", "Naila Janjgir", "Tilda Newra", "Mungeli", "Manendragarh", "Sakti", "Srinagar", "Jammu", "Baramula", "Anantnag", "Sopore", "KathUrban Agglomeration", "Rajauri", "Punch", "Udhampur", "Dhanbad", "Ranchi", "Jamshedpur", "Bokaro Steel City", "Deoghar", "Phusro", "Adityapur", "Hazaribag", "Giridih", "Ramgarh", "Jhumri Tilaiya", "Saunda", "Sahibganj", "Medininagar", "Chaibasa", "Chatra", "Gumia", "Dumka", "Madhupur", "Chirkunda", "Pakaur", "Simdega", "Musabani", "Mihijam", "Patratu", "Lohardaga", "Tenu dam-cum-Kathhara", "Shillong", "Tura", "Nongstoin", "Indore", "Bhopal", "Jabalpur", "Gwalior", "Ujjain", "Sagar", "Ratlam", "Satna", "Murwara", "Morena", "Singrauli", "Rewa", "Vidisha", "Ganjbasoda", "Shivpuri", "Mandsaur", "Neemuch", "Nagda", "Itarsi", "Sarni", "Sehore", "Mhow Cantonment", "Seoni", "Balaghat", "Ashok Nagar", "Tikamgarh", "Shahdol", "Pithampur", "Alirajpur", "Mandla", "Sheopur", "Shajapur", "Panna", "Raghogarh-Vijaypur", "Sendhwa", "Sidhi", "Pipariya", "Shujalpur", "Sironj", "Pandhurna", "Nowgong", "Mandideep", "Sihora", "Raisen", "Lahar", "Maihar", "Sanawad", "Sabalgarh", "Umaria", "Porsa", "Narsinghgarh", "Malaj Khand", "Sarangpur", "Mundi", "Nepanagar", "Pasan", "Mahidpur", "Seoni-Malwa", "Rehli", "Manawar", "Rahatgarh", "Panagar", "Wara Seoni", "Tarana", "Sausar", "Rajgarh", "Niwari", "Mauganj", "Manasa", "Nainpur", "Prithvipur", "Sohagpur", "Nowrozabad", "Shamgarh", "Maharajpur", "Multai", "Pali", "Pachore", "Rau", "Mhowgaon", "Vijaypur", "Narsinghgarh", "Visakhapatnam", "Vijayawada", "Guntur", "Nellore", "Kurnool", "Rajahmundry", "Kakinada", "Tirupati", "Anantapur", "Kadapa", "Vizianagaram", "Eluru", "Ongole", "Nandyal", "Machilipatnam", "Adoni", "Tenali", "Chittoor", "Hindupur", "Proddatur", "Bhimavaram", "Madanapalle", "Guntakal", "Dharmavaram", "Gudivada", "Srikakulam", "Narasaraopet", "Rajampet", "Tadpatri", "Tadepalligudem", "Chilakaluripet", "Yemmiganur", "Kadiri", "Chirala", "Anakapalle", "Kavali", "Palacole", "Sullurpeta", "Tanuku", "Rayachoti", "Srikalahasti", "Bapatla", "Naidupet", "Nagari", "Gudur", "Vinukonda", "Narasapuram", "Nuzvid", "Markapur", "Ponnur", "Kandukur", "Bobbili", "Rayadurg", "Samalkot", "Jaggaiahpet", "Tuni", "Amalapuram", "Bheemunipatnam", "Venkatagiri", "Sattenapalle", "Pithapuram", "Palasa Kasibugga", "Parvathipuram", "Macherla", "Gooty", "Salur", "Mandapeta", "Jammalamadugu", "Peddapuram", "Punganur", "Nidadavole", "Repalle", "Ramachandrapuram", "Kovvur", "Tiruvuru", "Uravakonda", "Narsipatnam", "Yerraguntla", "Pedana", "Puttur", "Renigunta", "Rajam", "Srisailam Project Township"
  ];

  // Filter cities based on search input
  const filteredCities = form.city ? indianCities.filter(city => 
    city.toLowerCase().includes(form.city.toLowerCase())
  ) : [];

  // State for city search dropdown
  const [showCityDropdown, setShowCityDropdown] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navbar */}
      <nav className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 shadow-sm z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <img 
                src="/logo_2.png" 
                alt="ArtInYou Logo" 
                className="h-12 w-auto object-contain"
              />
            </div>
            
            {/* Navigation */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/profile-preview')}
                disabled={!profileSaved || !userId}
                className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 ${
                  profileSaved && userId
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-md hover:shadow-lg'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
                title={profileSaved && userId ? "Preview your profile" : "Save your profile first to preview"}
              >
                Preview Profile
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="pt-20 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Existing Profile Loaded Indicator */}
          {profileSaved && (
            <div className="mb-6 rounded-xl bg-blue-50 border border-blue-200 p-4">
              <div className="flex items-center justify-center space-x-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-blue-800 font-medium">Existing profile loaded - You can edit any field and save changes</span>
              </div>
            </div>
          )}
          
          {/* Profile Header Section */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
            {/* Cover Photo */}
            <div className="relative h-64 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500">
              {form.coverBanner ? (
                <img
                  src={URL.createObjectURL(form.coverBanner)}
                  alt="Cover Banner"
                  className="w-full h-full object-cover"
                />
              ) : form.coverBannerUrl ? (
                <img
                  src={form.coverBannerUrl}
                  alt="Cover Banner"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center relative overflow-hidden">
                  {/* Animated background elements */}
                  <div className="absolute inset-0 opacity-20">
                    <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-xl"></div>
                    <div className="absolute bottom-20 right-20 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
                    <div className="absolute top-1/2 left-1/3 w-16 h-16 bg-white/10 rounded-full blur-lg"></div>
                  </div>
                  <div className="text-center text-white relative z-10">
                    <svg className="w-20 h-20 mx-auto mb-4 opacity-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-xl font-semibold opacity-95 mb-2">Add a stunning cover photo</p>
                    <p className="text-sm opacity-80">Make your profile stand out</p>
                  </div>
                </div>
              )}
              
              {/* Cover Photo Upload Button */}
              <div className="absolute top-6 right-6">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, 'banner')}
                  className="hidden"
                  id="cover-banner"
                />
                <label
                  htmlFor="cover-banner"
                  className="inline-flex items-center px-5 py-3 bg-white/95 backdrop-blur-sm border border-white/20 rounded-full text-sm font-semibold text-gray-700 hover:bg-white hover:shadow-lg transition-all duration-300 cursor-pointer shadow-xl"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  {form.coverBanner ? 'Change Cover' : form.coverBannerUrl ? 'Change Cover' : 'Add Cover'}
                </label>
              </div>
            </div>

            {/* Profile Info Section */}
            <div className="px-10 pb-10">
              <div className="flex flex-col items-center -mt-24 mb-8">
                {/* Profile Picture */}
                <div className="relative mb-8">
                  <div className="w-48 h-48 rounded-full border-8 border-white bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden shadow-2xl">
                    {form.profilePicture ? (
                      <img
                        src={URL.createObjectURL(form.profilePicture)}
                        alt="Profile Picture"
                        className="w-full h-full object-cover"
                      />
                    ) : form.profilePictureUrl ? (
                      <img
                        src={form.profilePictureUrl}
                        alt="Profile Picture"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                        <svg className="w-24 h-24 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  
                  {/* Profile Picture Upload Button */}
                  <input
                    type="file"
                    accept="image/*"
                    required
                    onChange={(e) => handleFileChange(e, 'profile')}
                    className="hidden"
                    id="profile-picture"
                  />
                  <label
                    htmlFor="profile-picture"
                    className="absolute bottom-3 right-3 inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 border-4 border-white rounded-full text-white hover:from-blue-600 hover:to-purple-700 transition-all duration-300 cursor-pointer shadow-xl hover:shadow-2xl hover:scale-110"
                    title="Upload profile picture"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </label>
                  <div className="text-center mt-2">
                    <span className="text-xs text-gray-500">
                      {form.profilePicture ? 'Click to change' : form.profilePictureUrl ? 'Click to change' : 'Click to upload'}
                    </span>
                  </div>
                </div>

                {/* Basic Info - Centered below profile picture */}
                <div className="text-center mb-8 w-full max-w-2xl">
                  <div className="mb-6">
                    <input
                      type="text"
                      required
                      placeholder="Your Name"
                      value={form.fullName}
                      onChange={(e) => update("fullName", e.target.value)}
                      className="text-4xl font-bold text-gray-900 bg-transparent border-none outline-none placeholder-gray-300 w-full min-h-[3.5rem] leading-tight focus:placeholder-gray-400 transition-all duration-300 text-center"
                    />
                  </div>
                  
                  {/* Short Bio - Right below the name */}
                  <div className="mb-8">
                    <textarea
                      placeholder="Tell us about yourself, your experience, and what makes you unique as an artist..."
                      value={form.bio || ''}
                      onChange={(e) => update("bio", e.target.value)}
                      rows={3}
                      className="bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent focus:bg-white transition-all duration-300 w-full resize-none shadow-sm hover:shadow-md"
                    />
                  </div>
                  
                  {/* Location and Contact - Side by side */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Location Info */}
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100 shadow-sm">
                      <div className="flex items-center justify-center mb-4">
                        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center mr-3">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </div>
                        <span className="text-blue-700 font-semibold text-lg">Location</span>
                      </div>
                      
                      <div className="space-y-3">
                        <select
                          value={form.area}
                          onChange={(e) => update("area", e.target.value)}
                          className="w-full bg-white border border-blue-200 rounded-xl px-4 py-3 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm"
                        >
                          <option value="">Select Area</option>
                          {areaOptions.map((area) => (
                            <option key={area} value={area}>
                              {area}
                            </option>
                          ))}
                        </select>
                        
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="Type city name (e.g., Kol for Kolkata)"
                            value={form.city}
                            onChange={(e) => {
                              update("city", e.target.value);
                              setShowCityDropdown(true);
                            }}
                            onFocus={() => setShowCityDropdown(true)}
                            onBlur={() => setTimeout(() => setShowCityDropdown(false), 200)}
                            className="w-full bg-white border border-blue-200 rounded-xl px-4 py-3 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm"
                          />
                          
                          {/* City Search Dropdown */}
                          {showCityDropdown && filteredCities.length > 0 && (
                            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                              {filteredCities.map((city) => (
                                <div
                                  key={city}
                                  className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-sm text-gray-700"
                                  onClick={() => {
                                    update("city", city);
                                    setShowCityDropdown(false);
                                  }}
                                >
                                  {city}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        <input
                          type="text"
                          placeholder="Country (e.g., India)"
                          value={form.country}
                          onChange={(e) => update("country", e.target.value)}
                          className="w-full bg-white border border-blue-200 rounded-xl px-4 py-3 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm"
                        />
                      </div>
                    </div>

                    {/* Contact Details */}
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-100 shadow-sm">
                      <div className="flex items-center justify-center mb-4">
                        <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center mr-3">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                        </div>
                        <span className="text-green-700 font-semibold text-lg">Contact Details</span>
                      </div>
                      
                      <div className="space-y-3">
                        <input
                          type="tel"
                          required
                          placeholder="Phone Number"
                          value={form.phone || ''}
                          onChange={(e) => update("phone", e.target.value)}
                          className="w-full bg-white border border-green-200 rounded-xl px-4 py-3 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 shadow-sm"
                        />
                        
                        <input
                          type="email"
                          required
                          placeholder="Email Address"
                          value={form.email}
                          onChange={(e) => update("email", e.target.value)}
                          className="w-full bg-white border border-green-200 rounded-xl px-4 py-3 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 shadow-sm"
                        />
                      </div>

                      {/* Social Media Links */}
                      <div className="mt-6 pt-4 border-t border-green-200">
                        <div className="flex items-center justify-center mb-4">
                          <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center mr-2">
                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                            </svg>
                          </div>
                          <span className="text-purple-700 font-medium text-sm">Social Media</span>
                        </div>
                        
                        {/* Social Media Icons - Side by Side */}
                        <div className="flex justify-center space-x-4 mb-4">
                          {/* Instagram */}
                          <button
                            onClick={() => update("showInstagram", !form.showInstagram)}
                            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 ${
                              form.instagram ? 'bg-gradient-to-r from-pink-500 to-purple-500 shadow-lg' : 'bg-gray-200 hover:bg-gray-300'
                            }`}
                            title={form.instagram ? "Edit Instagram" : "Add Instagram"}
                          >
                            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                            </svg>
                          </button>

                          {/* Facebook */}
                          <button
                            onClick={() => update("showFacebook", !form.showFacebook)}
                            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 ${
                              form.facebook ? 'bg-blue-600 shadow-lg' : 'bg-gray-200 hover:bg-gray-300'
                            }`}
                            title={form.facebook ? "Edit Facebook" : "Add Facebook"}
                          >
                            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                            </svg>
                          </button>

                          {/* YouTube */}
                          <button
                            onClick={() => update("showYouTube", !form.showYouTube)}
                            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 ${
                              form.youtube ? 'bg-red-600 shadow-lg' : 'bg-gray-200 hover:bg-gray-300'
                            }`}
                            title={form.youtube ? "Edit YouTube" : "Add YouTube"}
                          >
                            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                            </svg>
                          </button>
                        </div>

                        {/* Expandable Input Fields */}
                        <div className="space-y-3">
                          {/* Instagram Input */}
                          {form.showInstagram && (
                            <div className="flex items-center space-x-2 bg-white rounded-lg p-3 border border-green-200 shadow-sm">
                              <div className="w-6 h-6 bg-gradient-to-r from-pink-500 to-purple-500 rounded flex items-center justify-center flex-shrink-0">
                                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                                </svg>
                              </div>
                              <input
                                type="url"
                                placeholder="Instagram Profile URL"
                                value={form.instagram || ''}
                                onChange={(e) => update("instagram", e.target.value)}
                                className="flex-1 bg-transparent border-none outline-none text-sm text-gray-700 placeholder-gray-400"
                              />
                              <button
                                onClick={() => update("showInstagram", false)}
                                className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors duration-200"
                              >
                                <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          )}

                          {/* Facebook Input */}
                          {form.showFacebook && (
                            <div className="flex items-center space-x-2 bg-white rounded-lg p-3 border border-green-200 shadow-sm">
                              <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center flex-shrink-0">
                                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                                </svg>
                              </div>
                              <input
                                type="url"
                                placeholder="Facebook Profile URL"
                                value={form.facebook || ''}
                                onChange={(e) => update("facebook", e.target.value)}
                                className="flex-1 bg-transparent border-none outline-none text-sm text-gray-700 placeholder-gray-400"
                              />
                              <button
                                onClick={() => update("showFacebook", false)}
                                className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors duration-200"
                              >
                                <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          )}

                          {/* YouTube Input */}
                          {form.showYouTube && (
                            <div className="flex items-center space-x-2 bg-white rounded-lg p-3 border border-green-200 shadow-sm">
                              <div className="w-6 h-6 bg-red-600 rounded flex items-center justify-center flex-shrink-0">
                                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                                </svg>
                              </div>
                              <input
                                type="url"
                                placeholder="YouTube Channel URL"
                                value={form.youtube || ''}
                                onChange={(e) => update("youtube", e.target.value)}
                                className="flex-1 bg-transparent border-none outline-none text-sm text-gray-700 placeholder-gray-400"
                              />
                              <button
                                onClick={() => update("showYouTube", false)}
                                className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors duration-200"
                              >
                                <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* YouTube Video Section */}
          <div className="mt-8 bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center mr-4 shadow-lg">
                <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900">YouTube Video</h3>
                <p className="text-gray-600 text-base">Showcase your talent with a video</p>
              </div>
            </div>
            
            {/* Video Link Input */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">Video Link *</label>
              <div className="relative">
                <input
                  type="url"
                  required
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={form.youtubeVideo}
                  onChange={(e) => update("youtubeVideo", e.target.value)}
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-6 py-4 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent focus:bg-white transition-all duration-300 text-base shadow-sm hover:shadow-md"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-6">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Video Preview */}
            {videoId && (
              <div className="aspect-video bg-gray-100 rounded-2xl overflow-hidden shadow-lg border border-gray-200">
                <iframe
                  width="100%"
                  height="100%"
                  src={`https://www.youtube.com/embed/${videoId}`}
                  title="YouTube video player"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                ></iframe>
              </div>
            )}
            
            {!videoId && form.youtubeVideo && (
              <div className="aspect-video bg-gradient-to-br from-red-50 to-pink-50 rounded-2xl flex items-center justify-center border-2 border-red-200">
                <div className="text-center">
                  <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-red-600 font-semibold text-lg mb-2">Invalid YouTube URL</p>
                  <p className="text-red-500 text-sm">Please check the link format and try again</p>
                </div>
              </div>
            )}
            
            {!form.youtubeVideo && (
              <div className="aspect-video bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl flex items-center justify-center border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors duration-300">
                <div className="text-center">
                  <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                    <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-gray-600 font-semibold text-lg mb-2">Add a YouTube Video</p>
                  <p className="text-gray-500 text-sm max-w-sm">Paste a YouTube link above to showcase your talent and give clients a preview of your work</p>
                </div>
              </div>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="mt-6 rounded-xl bg-red-50 border border-red-200 p-4">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-red-400 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-red-800">Error</p>
                  <p className="text-sm text-red-600 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Success Display */}
          {profileSaved && (
            <div className="mt-6 rounded-xl bg-green-50 border border-green-200 p-4">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-green-400 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-green-800">Profile Saved Successfully!</p>
                  <p className="text-sm text-green-600 mt-1">You can now preview your profile or continue editing.</p>
                </div>
              </div>
            </div>
          )}

          {/* Existing Profile Indicator */}
          {profileSaved && (
            <div className="mt-4 rounded-xl bg-blue-50 border border-blue-200 p-4">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-blue-400 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-blue-800">Editing Existing Profile</p>
                  <p className="text-sm text-blue-600 mt-1">Your changes will update the existing profile. Click "Save Profile" to apply changes.</p>
                </div>
              </div>
            </div>
          )}

          {/* Test Firestore Connection */}
          <div className="mt-4 text-center">
            <button
              onClick={async () => {
                try {
                  console.log('Testing Firestore connection...');
                  console.log('Firebase instance:', firebase);
                  console.log('Firestore instance:', firebase.db);
                  console.log('User ID:', userId);
                  
                  // Try to write a simple test document
                  if (userId) {
                    await setDoc(doc(firebase.db, "test", "connection-test"), {
                      test: true,
                      timestamp: serverTimestamp(),
                      userId: userId
                    });
                    console.log('Test document written successfully!');
                    alert('Firestore connection test successful!');
                  } else {
                    alert('No user ID available');
                  }
                } catch (err: any) {
                  console.error('Firestore test failed:', err);
                  alert(`Firestore test failed: ${err?.message}`);
                }
              }}
              className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors duration-200 text-sm"
            >
              Test Firestore Connection
            </button>
          </div>

          {/* Submit Button */}
          <div className="mt-8">
            <div className="flex justify-center">
              {/* Save Profile Button */}
              <button
                onClick={submit}
                disabled={loading || uploading || !userId}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </div>
                ) : uploading ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Uploading...
                  </div>
                ) : (
                  profileSaved ? "Update Profile" : "Save Profile"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}



