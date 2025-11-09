import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Categorize issue using AI (NVIDIA API)
async function categorizeIssue(description: string): Promise<string> {
  try {
    const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.NVIDIA_API_KEY}`,
      },
      body: JSON.stringify({
        model: "nvidia/nemotron-nano-12b-v2-vl",
        messages: [
          {
            role: "user",
            content: `Categorize the following issue into ONE of these categories ONLY: Infrastructure, Health, Environment, Social, Education. 
            
Issue: ${description}

Respond with ONLY the category name, nothing else.`,
          },
        ],
        temperature: 0.3,
        max_tokens: 50,
      }),
    });

    if (!response.ok) {
      console.error("❌ NVIDIA API error:", response.statusText);
      return 'Environment'; // Default category
    }

    const data = await response.json();
    const category = data.choices[0]?.message?.content?.trim() || 'Environment';
    
    // Validate and normalize category
    const validCategories = ['Infrastructure', 'Health', 'Environment', 'Social', 'Education'];
    
    // Check for partial matches
    for (const validCat of validCategories) {
      if (category.toLowerCase().includes(validCat.toLowerCase().split('(')[0])) {
        console.log(`✅ Categorized as: ${validCat}`);
        return validCat;
      }
    }
    
    console.log(`⚠️  Unknown category "${category}", defaulting to Environment`);
    return 'Environment';
  } catch (error) {
    console.error("❌ Error categorizing issue:", error);
    return 'Environment'; // Default to Environment on error
  }
}

async function updateIssuesWithCategories() {
  console.log('📂 Reading issue.json...');
  
  const issuesPath = path.join(process.cwd(), 'docs', 'issue.json');
  const issuesData = JSON.parse(fs.readFileSync(issuesPath, 'utf-8'));
  
  console.log(`📊 Found ${issuesData.reports.length} issues to categorize\n`);
  
  let updatedCount = 0;
  
  for (let i = 0; i < issuesData.reports.length; i++) {
    const issue = issuesData.reports[i];
    console.log(`\n🔖 Processing ${issue.id} (${i + 1}/${issuesData.reports.length})`);
    console.log(`   Description: ${issue.description.substring(0, 80)}...`);
    
    // Add category if missing
    if (!issue.category) {
      const category = await categorizeIssue(issue.description);
      issue.category = category;
      updatedCount++;
    } else {
      console.log(`   ℹ️  Already has category: ${issue.category}`);
    }
    
    // Standardize fields - ensure consistent structure
    const standardizedIssue = {
      id: issue.id,
      description: issue.description,
      title: issue.title || issue.description.substring(0, 60) + '...', // Generate title if missing
      location: issue.location || {},
      timestamp: issue.timestamp,
      status: issue.status || 'open',
      category: issue.category,
      images: issue.images || [],
      votes: issue.votes || 0,
      downvotes: issue.downvotes || 0,
    };
    
    issuesData.reports[i] = standardizedIssue;
    
    // Add delay to avoid rate limiting
    if (i < issuesData.reports.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
    }
  }
  
  console.log('\n\n💾 Saving updated issues...');
  fs.writeFileSync(issuesPath, JSON.stringify(issuesData, null, 2));
  
  console.log(`\n✅ Successfully updated ${updatedCount} issues with categories!`);
  console.log(`📝 All ${issuesData.reports.length} issues now have standardized fields.`);
}

// Run the script
updateIssuesWithCategories().catch(console.error);
