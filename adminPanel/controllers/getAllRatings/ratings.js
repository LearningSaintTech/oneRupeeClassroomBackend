const Subcourse = require("../../../course/models/subcourse");
const {apiResponse} = require("../../../utils/apiResponse");
const {exportToCsv} = require("../../../utils/exportToCsv");

exports.getAllSubcourseNameAndAvgRating = async (req, res) => {
  try {
    // Fetch all subcourse names and average ratings
    const subcourses = await Subcourse.aggregate([
      {
        $project: {
          subcourseName: 1,
          avgRating: 1
        }
      }
    ]);

    if (!subcourses.length) {
      return apiResponse(res, {
        success: false,
        message: 'No subcourses found',
        statusCode: 404,
      });
    }

    // Add SNo to each subcourse
    const subcoursesWithSNo = subcourses.map((subcourse, index) => ({
      SNo: index + 1,
      subcourseName: subcourse.subcourseName,
      avgRating: subcourse.avgRating,
    }));

    return apiResponse(res, {
      success: true,
      message: 'Subcourses retrieved successfully',
      data: subcoursesWithSNo,
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error fetching subcourses:', error);
    return apiResponse(res, {
      success: false,
      message: `Failed to fetch subcourses: ${error.message}`,
      statusCode: 500,
    });
  }
};



exports.searchSubcoursesByKeyword = async (req, res) => {
  try {
    const { keyword } = req.query;
    console.log(`[DEBUG] Searching subcourses with keyword: ${keyword}`);

    // Check if keyword is provided
    if (!keyword || typeof keyword !== 'string') {
      console.log('[DEBUG] No valid keyword provided');
      return apiResponse(res, {
        success: true,
        message: 'No valid keyword provided',
        data: [],
        statusCode: 200,
      });
    }

    // Build query for subcourseName (case-insensitive partial match) or avgRating (exact match)
    const query = {
      $or: [
        { subcourseName: { $regex: keyword.trim(), $options: 'i' } },
      ]
    };

    // Check if keyword is a valid number for avgRating
    const parsedRating = parseFloat(keyword);
    if (!isNaN(parsedRating)) {
      query.$or.push({ avgRating: parsedRating });
    }

    // Fetch matching subcourses
    const subcourses = await Subcourse.find(query, 'subcourseName avgRating');

    // Handle case where no subcourses are found
    if (!subcourses.length) {
      console.log('[DEBUG] No subcourses found matching keyword');
      return apiResponse(res, {
        success: true,
        message: 'No subcourses found matching the keyword',
        data: [],
        statusCode: 200,
      });
    }

    return apiResponse(res, {
      success: true,
      message: 'Subcourses retrieved successfully',
      data: subcourses,
      statusCode: 200,
    });
  } catch (error) {
    console.error('[DEBUG] Error searching subcourses:', error);
    return apiResponse(res, {
      success: false,
      message: `Failed to search subcourses: ${error.message}`,
      statusCode: 500,
    });
  }
};



exports.exportSubcoursesToCsv = async (req, res) => {
  try {
    const { keyword } = req.query;
    console.log(`[DEBUG] Exporting subcourses to CSV with keyword: ${keyword}`);

    // Build query for subcourseName (case-insensitive partial match) or avgRating (exact match)
    const query = {};

    if (keyword && typeof keyword === 'string') {
      query.$or = [
        { subcourseName: { $regex: keyword.trim(), $options: 'i' } },
      ];
      // Check if keyword is a valid number for avgRating
      const parsedRating = parseFloat(keyword);
      if (!isNaN(parsedRating)) {
        query.$or.push({ avgRating: parsedRating });
      }
    }

    // Fetch matching subcourses
    const subcourses = await Subcourse.find(query, 'subcourseName avgRating');

    // Prepare data for CSV
    const csvData = subcourses.map(subcourse => ({
      subcourseName: subcourse.subcourseName,
      avgRating: subcourse.avgRating || 0, // Ensure avgRating is a number or 0
    }));

    // Define CSV columns
    const csvColumns = [
      { key: 'subcourseName', header: 'Subcourse Name' },
      { key: 'avgRating', header: 'Average Rating' },
    ];

    // Export to CSV using the utility function
    console.log(`[DEBUG] Exporting ${csvData.length} subcourses to CSV`);
    return exportToCsv(res, csvData, csvColumns, 'subcourses_export.csv');

  } catch (error) {
    console.error('[DEBUG] Error exporting subcourses to CSV:', error);
    return apiResponse(res, {
      success: false,
      message: `Failed to export subcourses: ${error.message}`,
      statusCode: 500,
    });
  }
};