import React, { useState, useMemo } from 'react';
import { Service } from '../types.ts';
import { SERVICES } from '../constants.ts';
import { Search, Sparkles, Scissors, Flower2, Palette } from 'lucide-react';

type MetaCategory = 'All' | 'Salon Services' | 'Hair Studio' | 'Hair Treatments' | 'Aesthetics';

const ServicesList: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<MetaCategory>('All');
  const [activeSubFilter, setActiveSubFilter] = useState<string>('All');

  // Helper to map specific categories to meta-groups
  const getMetaCategory = (category: string): MetaCategory => {
    if (category === 'Aesthetics') return 'Aesthetics';
    if (category === 'Hair') return 'Hair Treatments';
    if (category === 'Hair Studio') return 'Hair Studio';
    return 'Salon Services'; // Makeup, Facials, Manipedicure, Spa, Waxing
  };

  // Calculate available sub-categories based on active main filter
  const subCategories = useMemo(() => {
    if (activeFilter === 'All') return [];
    
    // Get unique categories within the selected meta group
    const cats = Array.from(new Set(
      SERVICES
        .filter(s => getMetaCategory(s.category) === activeFilter)
        .map(s => s.category)
    )).sort();

    // Only show sub-filters if there is more than one category in this group
    return cats.length > 1 ? ['All', ...cats] : [];
  }, [activeFilter]);

  // Filter logic
  const filteredServices = SERVICES.filter(service => {
    const meta = getMetaCategory(service.category);
    
    // 1. Search text
    const matchesSearch = 
      service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;

    // 2. Main Meta Filter
    if (activeFilter !== 'All' && meta !== activeFilter) return false;

    // 3. Sub Category Filter
    if (activeSubFilter !== 'All' && service.category !== activeSubFilter) return false;

    return true;
  });

  // Handle main filter change
  const handleFilterChange = (cat: MetaCategory) => {
    setActiveFilter(cat);
    setActiveSubFilter('All'); // Reset sub filter when switching main groups
  };

  // Grouping logic for display sections
  const groups = [
    {
      id: 'Salon Services',
      title: 'Salon Services',
      subtitle: 'Makeup, Facials, Spa, Manipedicure & Waxing',
      icon: <Flower2 className="w-5 h-5 text-glam-rose" />,
      items: filteredServices.filter(s => getMetaCategory(s.category) === 'Salon Services')
    },
    {
      id: 'Hair Studio',
      title: 'Hair Studio',
      subtitle: 'Cuts & Styling',
      icon: <Palette className="w-5 h-5 text-gray-700" />,
      items: filteredServices.filter(s => getMetaCategory(s.category) === 'Hair Studio')
    },
    {
      id: 'Hair Treatments',
      title: 'Hair Treatments',
      subtitle: 'Keune & L\'Oréal Certified',
      icon: <Scissors className="w-5 h-5 text-glam-gold" />,
      items: filteredServices.filter(s => getMetaCategory(s.category) === 'Hair Treatments')
    },
    {
      id: 'Aesthetics',
      title: 'Aesthetics Services',
      subtitle: 'Dr. Saima Hifazat',
      icon: <Sparkles className="w-5 h-5 text-purple-500" />,
      items: filteredServices.filter(s => getMetaCategory(s.category) === 'Aesthetics')
    }
  ];

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-glam-pink/50 h-full flex flex-col">
       {/* Header */}
       <div className="flex items-center gap-2 mb-4 shrink-0">
        <h2 className="text-xl font-serif font-bold text-glam-dark">Our Services</h2>
      </div>

      {/* Search */}
      <div className="relative mb-3 shrink-0">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
        <input
          type="text"
          className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg leading-5 bg-white placeholder-gray-400 focus:outline-none focus:placeholder-gray-300 focus:border-glam-rose focus:ring-1 focus:ring-glam-rose text-sm transition duration-150 ease-in-out"
          placeholder="Search treatments..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Main Filter Tabs */}
      <div className="flex gap-2 mb-2 overflow-x-auto pb-2 scrollbar-hide shrink-0">
        {(['All', 'Salon Services', 'Hair Studio', 'Hair Treatments', 'Aesthetics'] as MetaCategory[]).map((cat) => (
          <button
            key={cat}
            onClick={() => handleFilterChange(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors border ${
              activeFilter === cat 
                ? 'bg-glam-rose text-white border-glam-rose' 
                : 'bg-white text-gray-500 border-gray-200 hover:border-glam-rose/50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Sub Filter Tabs (Only visible when applicable) */}
      {subCategories.length > 0 && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide shrink-0 pl-1 border-t border-dashed border-gray-100 pt-2">
           {subCategories.map((subCat) => (
             <button
               key={subCat}
               onClick={() => setActiveSubFilter(subCat)}
               className={`px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition-colors border ${
                 activeSubFilter === subCat
                   ? 'bg-glam-rose text-white border-glam-rose'
                   : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
               }`}
             >
               {subCat}
             </button>
           ))}
        </div>
      )}

      {/* List */}
      <div className="space-y-6 overflow-y-auto flex-1 pr-1 custom-scrollbar">
        {groups.map(group => {
           if (group.items.length === 0) return null;
           
           return (
             <div key={group.id}>
               {/* Section Header */}
               <div className="flex items-center gap-2 mb-3 bg-gray-50 p-2 rounded-lg border border-gray-100">
                  {group.icon}
                  <div>
                    <h3 className="font-bold text-gray-800 text-sm">{group.title}</h3>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">{group.subtitle}</p>
                  </div>
               </div>
               
               {/* Items */}
               <div className="space-y-3 pl-2">
                 {group.items.map(service => (
                    <div key={service.id} className="border-b border-gray-50 last:border-0 pb-2 last:pb-0">
                        <div className="flex justify-between items-start gap-2">
                            <h4 className="font-medium text-gray-700 text-sm">{service.name}</h4>
                            <span className={`font-bold whitespace-nowrap text-xs ${service.price === 0 ? 'text-gray-400' : 'text-glam-rose'}`}>
                            {service.price === 0 ? 'Consultation' : `PKR ${service.price.toLocaleString()}`}
                            </span>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-0.5">{service.description}</p>
                    </div>
                 ))}
               </div>
             </div>
           );
        })}

        {filteredServices.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm">
            No services found matching your search.
          </div>
        )}
      </div>
    </div>
  );
};

export default ServicesList;
